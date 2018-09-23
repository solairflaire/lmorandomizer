use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::CStr;
use std::os::raw::c_char;
use std::panic;
use std::str;

thread_local!(static CHAR_LIST: RefCell<Vec<char>> = RefCell::new(Vec::<char>::with_capacity(0)));
thread_local!(static CODE_LIST: RefCell<Vec<u8>> = RefCell::new(Vec::with_capacity(0)));
thread_local!(static CHAR_TO_CODE: RefCell<HashMap<char, u8>> = RefCell::new(HashMap::new()));
thread_local!(static CODE_TO_CHAR: RefCell<HashMap<u8, char>> = RefCell::new(HashMap::new()));

extern "C" {
    fn js_console_log(ptr: *const u8, size: usize);
}

// 上の関数のラッパー
fn console_log(message: &str) {
    unsafe { js_console_log(message.as_ptr(), message.len()) };
}

#[no_mangle]
pub fn init() {
    // パニック時のフックを登録する
    panic::set_hook(Box::new(|panic_info| {
        let payload = panic_info.payload();

        // payload は Any なので String か &str だったら具象型に変換し Some にくるむ
        let payload = if payload.is::<String>() {
            Some(payload.downcast_ref::<String>().unwrap().as_str())
        } else if payload.is::<&str>() {
            Some(*payload.downcast_ref::<&str>().unwrap())
        } else {
            None
        };

        // PC での panic 表示を真似てフォーマット
        if let (Some(payload), Some(location)) = (payload, panic_info.location()) {
            console_log(
                format!(
                    "panicked at {:?}, {}:{}:{}",
                    payload,
                    location.file(),
                    location.line(),
                    location.column()
                ).as_str(),
            );
        }
    }));
}

#[no_mangle]
pub fn alloc_char_list(_len: i32) -> *const char {
    let len = _len as usize;
    let mut ptr: *const char = 0 as *const char;
    CHAR_LIST.with(|v| unsafe {
        let mut list = v.borrow_mut();
        list.reserve(len);
        list.set_len(len);
        ptr = list.as_ptr();
    });
    return ptr;
}

#[no_mangle]
pub fn alloc_code_list(_len: i32) -> *const u8 {
    let len = _len as usize;
    let mut ptr: *const u8 = 0 as *const u8;
    CODE_LIST.with(|v| unsafe {
        let mut list = v.borrow_mut();
        list.reserve(len);
        list.set_len(len);
        ptr = list.as_ptr();
    });
    return ptr;
}

#[no_mangle]
pub fn init_code_map() {
    borrow_all(|char_list, code_list, char_to_code, code_to_char| {
        for i in 0..char_list.len() {
            char_to_code.insert(char_list[i], code_list[i]);
            code_to_char.insert(code_list[i], char_list[i]);
        }
    });
}

fn borrow_all<F>(closure: F)
where
    F: Fn(&mut Vec<char>, &mut Vec<u8>, &mut HashMap<char, u8>, &mut HashMap<u8, char>),
{
    CHAR_LIST.with(|char_list_rc| {
        let mut char_list = char_list_rc.borrow_mut();
        CODE_LIST.with(|code_list_rc| {
            let mut code_list = code_list_rc.borrow_mut();
            CHAR_TO_CODE.with(|char_to_code_rc| {
                let mut char_to_code = char_to_code_rc.borrow_mut();
                CODE_TO_CHAR.with(|code_to_char_rc| {
                    let mut code_to_char = code_to_char_rc.borrow_mut();
                    closure(
                        &mut char_list,
                        &mut code_list,
                        &mut char_to_code,
                        &mut code_to_char,
                    );
                });
            });
        });
    });
}

#[no_mangle]
pub fn to_code(c: char) -> i32 {
    // let string = c_buf_to_rust_str(c_buf);
    // console_log("start");
    // console_log(string.as_str());
    // console_log("end");
    // let c = string.chars().last().unwrap();

    let mut result: i32 = -1;
    CHAR_TO_CODE.with(|char_to_code_rc| {
        let char_to_code = char_to_code_rc.borrow_mut();
        let code = char_to_code.get(&c);
        if code.is_none() {
            return;
        }
        result = code.unwrap().clone() as i32;
    });
    return result;
}

fn c_buf_to_rust_str(c_buf: *const c_char) -> String {
    unsafe { CStr::from_ptr(c_buf).to_string_lossy().into_owned() }
    // let c_str: &CStr = unsafe { CStr::from_ptr(c_buf) };
    // let buffer: &[u8] = c_str.to_bytes();
    // let rust_str: &str = str::from_utf8(buffer).unwrap();
    // return rust_str.to_owned();
}

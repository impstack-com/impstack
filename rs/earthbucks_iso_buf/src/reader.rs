use crate::isobuf_error::IsobufError;
use byteorder::{BigEndian, ReadBytesExt};
use std::io::Cursor;

pub struct Reader {
    buf: Cursor<Vec<u8>>,
}

impl Reader {
    pub fn new(buf: Vec<u8>) -> Reader {
        Reader {
            buf: Cursor::new(buf),
        }
    }

    pub fn eof(&self) -> bool {
        self.buf.position() as usize >= self.buf.get_ref().len()
    }

    pub fn remainder_len(&self) -> usize {
        self.buf.get_ref().len() - self.buf.position() as usize
    }

    pub fn read(&mut self, len: usize) -> Result<Vec<u8>, IsobufError> {
        let pos = self.buf.position() as usize;
        if pos + len > self.buf.get_ref().len() {
            return Err(IsobufError::NotEnoughDataError { source: None });
        }
        let buf = self.buf.get_ref()[pos..pos + len].to_vec();
        self.buf.set_position((pos + len) as u64);
        Ok(buf)
    }

    pub fn read_remainder(&mut self) -> Vec<u8> {
        let pos = self.buf.position() as usize;
        let buf = self.buf.get_ref()[pos..].to_vec();
        self.buf.set_position(self.buf.get_ref().len() as u64);
        buf
    }

    pub fn read_u8(&mut self) -> Result<u8, IsobufError> {
        self.buf
            .read_u8()
            .map_err(|_| IsobufError::NotEnoughDataError { source: None })
    }

    pub fn read_u16_be(&mut self) -> Result<u16, IsobufError> {
        self.buf
            .read_u16::<BigEndian>()
            .map_err(|_| IsobufError::NotEnoughDataError { source: None })
    }

    pub fn read_u32_be(&mut self) -> Result<u32, IsobufError> {
        self.buf
            .read_u32::<BigEndian>()
            .map_err(|_| IsobufError::NotEnoughDataError { source: None })
    }

    pub fn read_u64_be(&mut self) -> Result<u64, IsobufError> {
        self.buf
            .read_u64::<BigEndian>()
            .map_err(|_| IsobufError::NotEnoughDataError { source: None })
    }

    pub fn read_var_int_buf(&mut self) -> Result<Vec<u8>, IsobufError> {
        let first = self
            .read_u8()
            .map_err(|e| IsobufError::NotEnoughDataError {
                source: Some(Box::new(e)),
            })?;
        match first {
            0xfd => {
                let mut buf = vec![first];
                buf.extend_from_slice(&self.read(2).map_err(|e| {
                    IsobufError::NotEnoughDataError {
                        source: Some(Box::new(e)),
                    }
                })?);
                if Cursor::new(&buf[1..]).read_u16::<BigEndian>().unwrap() < 0xfd {
                    return Err(IsobufError::NonMinimalEncodingError { source: None });
                }
                Ok(buf)
            }
            0xfe => {
                let mut buf = vec![first];
                buf.extend_from_slice(&self.read(4).map_err(|e| {
                    IsobufError::NotEnoughDataError {
                        source: Some(Box::new(e)),
                    }
                })?);

                if Cursor::new(&buf[1..]).read_u32::<BigEndian>().unwrap() < 0x10000 {
                    return Err(IsobufError::NonMinimalEncodingError { source: None });
                }
                Ok(buf)
            }
            0xff => {
                let mut buf = vec![first];
                buf.extend_from_slice(&self.read(8).map_err(|e| {
                    IsobufError::NotEnoughDataError {
                        source: Some(Box::new(e)),
                    }
                })?);
                if Cursor::new(&buf[1..]).read_u64::<BigEndian>().unwrap() < 0x100000000 {
                    return Err(IsobufError::NonMinimalEncodingError { source: None });
                }
                Ok(buf)
            }
            _ => Ok(vec![first]),
        }
    }

    pub fn read_var_int(&mut self) -> Result<u64, IsobufError> {
        let buf = self.read_var_int_buf()?;
        let first = buf[0];
        match first {
            0xfd => Ok(Cursor::new(&buf[1..]).read_u16::<BigEndian>().unwrap() as u64),
            0xfe => Ok(Cursor::new(&buf[1..]).read_u32::<BigEndian>().unwrap() as u64),
            0xff => Ok(Cursor::new(&buf[1..]).read_u64::<BigEndian>().unwrap()),
            _ => Ok(first as u64),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use byteorder::{BigEndian, WriteBytesExt};
    use serde::Deserialize;

    #[test]
    fn test_read() {
        let mut reader = Reader::new(vec![1, 2, 3, 4, 5]);
        assert_eq!(reader.read(3).unwrap(), vec![1, 2, 3]);
        assert_eq!(reader.read(2).unwrap(), vec![4, 5]);
    }

    #[test]
    fn test_read_u8() {
        let mut reader = Reader::new(vec![1, 2, 3, 4, 5]);
        assert_eq!(reader.read_u8().unwrap(), 1);
        assert_eq!(reader.read_u8().unwrap(), 2);
    }

    #[test]
    fn test_read_u16_be() {
        let mut buffer_reader = Reader::new(vec![0x01, 0x23]);
        assert_eq!(buffer_reader.read_u16_be().unwrap(), 0x0123);
    }

    #[test]
    fn test_read_u32_be() {
        let mut data = vec![];
        data.write_u32::<BigEndian>(1234567890).unwrap();
        data.write_u32::<BigEndian>(987654321).unwrap();

        let mut reader = Reader::new(data);
        assert_eq!(reader.read_u32_be().unwrap(), 1234567890);
        assert_eq!(reader.read_u32_be().unwrap(), 987654321);
    }

    #[test]
    fn test_read_u64_be_big_int() {
        let mut data = vec![];
        data.write_u64::<BigEndian>(12345678901234567890).unwrap();
        data.write_u64::<BigEndian>(9876543210987654321).unwrap();

        let mut reader = Reader::new(data);
        assert_eq!(reader.read_u64_be().unwrap(), 12345678901234567890);
        assert_eq!(reader.read_u64_be().unwrap(), 9876543210987654321);
    }

    #[test]
    fn test_read_var_int_buf() {
        let data = vec![0xfd, 0x01, 0x00];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int_buf().unwrap(), vec![0xfd, 0x01, 0x00]);

        let data = vec![0xfe, 0x01, 0x00, 0x00, 0x00];
        let mut reader = Reader::new(data);
        assert_eq!(
            reader.read_var_int_buf().unwrap(),
            vec![0xfe, 0x01, 0x00, 0x00, 0x00]
        );

        let data = vec![0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        let mut reader = Reader::new(data);
        assert_eq!(
            reader.read_var_int_buf().unwrap(),
            vec![0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        );

        let data = vec![0x01];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int_buf().unwrap(), vec![0x01]);
    }

    #[test]
    fn test_read_var_int() {
        let data = vec![0xfd, 0x10, 0x01];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int().unwrap(), 0x1000 + 1);

        let data = vec![0xfe, 0x10, 0x00, 0x00, 0x01];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int().unwrap(), 0x10000000 + 1);

        let data = vec![0xff, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int().unwrap(), 0x1000000000000000 + 1);

        let data = vec![0x01];
        let mut reader = Reader::new(data);
        assert_eq!(reader.read_var_int().unwrap(), 1);
    }

    // standard test vectors

    #[derive(Deserialize)]
    struct TestVectorIsoBufReader {
        read: TestVectorReadIsoBuf,
        read_u8: TestVectorReadErrors,
        read_u16_be: TestVectorReadErrors,
        read_u32_be: TestVectorReadErrors,
        read_u64_be: TestVectorReadErrors,
        read_var_int_buf: TestVectorReadErrors,
        read_var_int: TestVectorReadErrors,
    }

    #[derive(Deserialize)]
    struct TestVectorReadIsoBuf {
        errors: Vec<TestVectorReadIsoBufError>,
    }

    #[derive(Deserialize)]
    struct TestVectorReadIsoBufError {
        hex: String,
        len: usize,
        error: String,
    }

    #[derive(Deserialize)]
    struct TestVectorReadErrors {
        errors: Vec<TestVectorReadError>,
    }

    #[derive(Deserialize)]
    struct TestVectorReadError {
        hex: String,
        error: String,
    }

    #[test]
    fn test_vectors_read() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read(test_vector.len);
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }

    #[test]
    fn test_vectors_read_u8() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_u8.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_u8();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert_eq!(e.to_string(), test_vector.error),
            }
        }
    }

    #[test]
    fn test_vectors_read_u16_be() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_u16_be.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_u16_be();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }

    #[test]
    fn test_vectors_read_u32_be() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_u32_be.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_u32_be();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }

    #[test]
    fn test_vectors_read_u64_be() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_u64_be.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_u64_be();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }

    #[test]
    fn test_vectors_read_var_int_buf() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_var_int_buf.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_var_int_buf();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }

    #[test]
    fn test_vectors_read_var_int() {
        let data = fs::read_to_string("./test_vectors/reader.json").expect("Unable to read file");
        let test_vectors: TestVectorIsoBufReader =
            serde_json::from_str(&data).expect("Unable to parse JSON");
        for test_vector in test_vectors.read_var_int.errors {
            let buf = hex::decode(&test_vector.hex).expect("Failed to decode hex");
            let mut reader = Reader::new(buf);
            let result = reader.read_var_int();
            match result {
                Ok(_) => panic!("Expected an error, but got Ok(_)"),
                Err(e) => assert!(e.to_string().starts_with(&test_vector.error)),
            }
        }
    }
}
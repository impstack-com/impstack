pub struct TransactionSignature {
    hash_type: u8,
    sig_buf: Vec<u8>,
}

impl TransactionSignature {
    pub const SIGHASH_ALL: u8 = 0x00000001;
    pub const SIGHASH_NONE: u8 = 0x00000002;
    pub const SIGHASH_SINGLE: u8 = 0x00000003;
    pub const SIGHASH_ANYONECANPAY: u8 = 0x00000080;

    pub fn new(hash_type: u8, sig_buf: Vec<u8>) -> Self {
        Self { hash_type, sig_buf }
    }

    pub fn to_u8_vec(&self) -> Vec<u8> {
        let mut result = Vec::new();
        result.push(self.hash_type as u8);
        result.extend(&self.sig_buf);
        result
    }
}

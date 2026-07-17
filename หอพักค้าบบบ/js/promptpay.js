// promptpay.js

export function crc16(data) {
    let crc = 0xFFFF;

    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }

    return (crc & 0xFFFF)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
}

export function generatePromptPayPayload(promptpayId, amount) {

    let phone = promptpayId.replace(/\D/g, "");

    if (phone.startsWith("0")) {
        phone = "66" + phone.substring(1);
    }

    const merchant =
        "0016A000000677010111011300" +
        phone;

    const amountText =
        Number(amount).toFixed(2);

    let payload =
        "000201" +
        "010211" +
        "2937" +
        merchant +
        "5802TH" +
        "5303764" +
        "54" +
        amountText.length.toString().padStart(2, "0") +
        amountText +
        "6304";

    payload += crc16(payload);

    return payload;
}
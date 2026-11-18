const bwipjs = require("bwip-js")
const QRCode = require("qrcode")

async function generateLabelPayload(asset) {
  if (!asset?.painCode) throw new Error("Asset PAIN code is required")

  const displayPayload = [
    "FUNAAB UAMS",
    asset.painCode,
    asset.name,
    asset.department?.code ? `UNIT:${asset.department.code}` : null,
  ].filter(Boolean).join("\n")

  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: "code128",
    text: asset.painCode,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  })

  const qrDataUrl = await QRCode.toDataURL(asset.painCode, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  })

  return {
    format: "THERMAL_LABEL",
    width: "50mm",
    height: "30mm",
    painCode: asset.painCode,
    textPayload: displayPayload,
    barcode: {
      type: "CODE128",
      encoding: "base64",
      mediaType: "image/png",
      data: barcodeBuffer.toString("base64"),
    },
    qr: {
      type: "QR",
      encoding: "data-url",
      mediaType: "image/png",
      data: qrDataUrl,
    },
    printerConnected: false,
    integrationMessage: "Print-ready payload only. No physical printer integration is configured.",
  }
}

module.exports = { generateLabelPayload }

import QRCode from 'qrcode'

/**
 * Generate a QR code as a base64 data URL (PNG) that can be embedded
 * directly in HTML or print templates without external API calls.
 */
export async function generateQRDataURL(data: string, size: number = 150): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
    return dataUrl
  } catch (err) {
    console.error('QR code generation failed:', err)
    return ''
  }
}

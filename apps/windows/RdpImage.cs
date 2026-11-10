using System.IO;
using System.Windows.Media.Imaging;

namespace AiSysadminDesktop;

public static class RdpImage
{
    public static string Validate(string image, bool reviewed)
    {
        if (!reviewed) throw new ArgumentException("Revisá la captura y confirmá su envío al proveedor.");
        if (!image.StartsWith("data:image/png;base64,", StringComparison.Ordinal) || image.Length > 5600000)
            throw new ArgumentException("La captura debe ser PNG y no superar 4 MiB.");
        try {
            var bytes = Convert.FromBase64String(image[22..]);
            if (bytes.Length > 4 * 1024 * 1024) throw new ArgumentException("Captura demasiado grande.");
            if (bytes.Length < 24 || !bytes.AsSpan(0,8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10})) throw new ArgumentException("La captura PNG no es válida.");
            var width = System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16,4));
            var height = System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20,4));
            if (width is < 1 or > 4096 || height is < 1 or > 4096 || (long)width * height > 10000000) throw new ArgumentException("Dimensiones de captura no admitidas.");
            using var stream = new MemoryStream(bytes);
            var decoder = new PngBitmapDecoder(stream, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);
            var frame = decoder.Frames[0];
            if (frame.PixelWidth is < 1 or > 4096 || frame.PixelHeight is < 1 or > 4096 || (long)frame.PixelWidth * frame.PixelHeight > 10000000)
                throw new ArgumentException("Dimensiones de captura no admitidas.");
            return image;
        } catch (Exception error) when (error is FormatException or NotSupportedException or FileFormatException or IOException) {
            throw new ArgumentException("La captura PNG no es válida.");
        }
    }
}

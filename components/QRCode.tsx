export function QRCode({ value }: { value: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}`;
  return (
    <img
      src={src}
      alt="Join QR code"
      className="h-60 w-60 rounded-[24px] border border-slate-200 bg-white p-3 shadow-soft"
    />
  );
}

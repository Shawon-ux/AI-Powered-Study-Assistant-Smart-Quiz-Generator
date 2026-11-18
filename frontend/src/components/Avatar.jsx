export default function Avatar({ user, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (user.avatar)
    return <img src={user.avatar} alt="" className="rounded-full object-cover shrink-0" style={style} />;
  return (
    <span className="rounded-full grid place-items-center text-white font-bold shrink-0"
          style={{ ...style, background: "linear-gradient(135deg,var(--brand),var(--brand-2))" }}>
      {user.name?.[0]?.toUpperCase()}
    </span>
  );
}

// center-crop to a square and shrink so the stored picture stays small (~20 KB)
export function resizeImage(file, px = 256) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error("Please choose a PNG, JPEG or WebP image."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = px;
      c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, px, px);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}

/** 星等顯示(1~3 星),full 為亮起數量 */
export function StarRating({ full, size = 24 }: { full: number; size?: number }) {
  return (
    <span aria-label={`${full} 顆星`} style={{ fontSize: size, letterSpacing: 2 }}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{ opacity: n <= full ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}

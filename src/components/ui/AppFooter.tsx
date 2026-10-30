// Footer bersama halaman app (gate, control, layar). Layar tampilan (/timer, /matador) tidak memakainya.
export function AppFooter() {
  return (
    <footer className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm text-sub sm:flex-row">
      <a
        href="https://digioh.id"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by DigiOH"
        className="flex items-center gap-2.5 text-fg hover:opacity-80"
      >
        <span>Powered by</span>
        {/* Dua versi logo: warna untuk mode terang, putih untuk mode gelap (lihat .logo-light/.logo-dark). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/digioh-logo.svg" alt="" aria-hidden="true" className="logo-light h-6 w-auto" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/digioh-logo-white.svg" alt="" aria-hidden="true" className="logo-dark h-6 w-auto" />
        <span className="sr-only">DigiOH</span>
      </a>
      <p>© {new Date().getFullYear()} DigiOH. Seluruh hak cipta dilindungi.</p>
    </footer>
  );
}

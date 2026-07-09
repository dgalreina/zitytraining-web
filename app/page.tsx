import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Zitytraining</h1>
      <p>Bienvenido a la plataforma de gestión del gimnasio.</p>
      <Link href="/login">Iniciar sesión</Link>
    </main>
  );
}
'use client';

export default function LoginPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-space-black">
      <div className="glass-panel p-8 w-96">
        <h1 className="text-2xl font-bold neon-text text-center mb-6">KRATOS</h1>
        <div className="space-y-4">
          <input placeholder="Username" className="cyber-input" />
          <input placeholder="Password" type="password" className="cyber-input" />
          <button className="cyber-button cyber-button-primary w-full">Authenticate</button>
        </div>
      </div>
    </div>
  );
}

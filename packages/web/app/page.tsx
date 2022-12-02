import Link from 'next/link';

export default function Page() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">欢迎使用fura</h1>
          <p className="py-6">致力于打造前端项目管理的美好体验</p>
          <Link className="btn btn-primary" href="/dashboard">
            开始使用
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <div className="navbar bg-gray-800 z-50 p-4">
        <div className="flex-1">
          <span className="text-white text-xl font-semibold">fura管理后台</span>
        </div>
      </div>
      <div className="flex flex-nowrap flex-grow gap-4 p-4">
        <div className="flex-initial">
          <ul className="menu bg-base-100 w-56 p-4 rounded-box shadow-md">
            <li>
              <Link className="active" href="/dashboard/overview">
                项目总览
              </Link>
            </li>
            <li>
              <Link href="/dashboard/project_clean">功能模块</Link>
            </li>
            <li>
              <Link href="/dashboard/project_clean">变更导出</Link>
            </li>
            <li>
              <Link href="/dashboard/project_clean">项目清洁</Link>
            </li>
          </ul>
        </div>
        <div className="flex-grow card bg-base-100 shadow-md p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

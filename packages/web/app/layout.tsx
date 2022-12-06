import React from 'react';

import './globals.css';

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="bg-gray-50 w-screen">{children}</body>
    </html>
  );
}

export default RootLayout;

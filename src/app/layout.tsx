import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandBar } from '@/components/command-bar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'MediStay | Medicare Retention SaaS',
  description: 'Enterprise-grade Medicare member retention platform for agencies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <SidebarProvider defaultOpen={true}>
          <div className="flex h-screen w-screen overflow-hidden">
            <AppSidebar />
            <main className="flex-1 flex flex-col relative h-full bg-background">
              {children}
            </main>
          </div>
          <CommandBar />
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}

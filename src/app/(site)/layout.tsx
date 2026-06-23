import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import YoutubeBanner from "@/components/layout/YoutubeBanner";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <YoutubeBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

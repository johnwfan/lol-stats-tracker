import HomeNav from "@/components/home/HomeNav";
import HeroPoster from "@/components/home/HeroPoster";
import ProductShowcase from "@/components/home/ProductShowcase";

export default function Home() {
  return (
    <main className="min-h-screen bg-hp-bg">
      <HomeNav />
      <HeroPoster />
      <ProductShowcase />
    </main>
  );
}

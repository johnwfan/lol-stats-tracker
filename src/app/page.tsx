import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchForm from "@/components/SearchForm";
import SearchChips from "@/components/SearchChips";
import FeatureHighlights from "@/components/FeatureHighlights";

export default function Home() {
  return (
    <main>
      <Navbar />

      <Hero>
        <SearchForm />
        <SearchChips />
      </Hero>

      <FeatureHighlights />
    </main>
  );
}

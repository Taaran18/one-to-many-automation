import Navbar       from '@/components/landing/Navbar';
import Hero          from '@/components/landing/Hero';
import Features      from '@/components/landing/Features';
import Testimonials  from '@/components/landing/Testimonials';
import Pricing       from '@/components/landing/Pricing';
import About         from '@/components/landing/About';
import FAQ           from '@/components/landing/FAQ';
import Contact       from '@/components/landing/Contact';
import Footer        from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <About />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

import { HeroSection } from "@/components/ui/hero-section-dark"

function HeroSectionDemo() {
  return (
    <HeroSection
      title="Build AI Agents Visually"
      subtitle={{
        regular: "Create powerful agents with ",
        gradient: "visual flow builder",
      }}
      description="Build, visualize, and deploy AI agents without writing code. Seamless integration with Google ADK and powerful agent development tools."
      ctaText="Get Started"
      ctaHref="/auth"
      bottomImage={{
        light: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        dark: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2125&q=80",
      }}
      gridOptions={{
        angle: 65,
        opacity: 0.4,
        cellSize: 50,
        lightLineColor: "#4a4a4a",
        darkLineColor: "#2a2a2a",
      }}
    />
  )
}

export { HeroSectionDemo } 
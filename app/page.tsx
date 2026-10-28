
const projects = [
  {
    number: "01",
    name: "OTA Tracker",
    category: "CONNECTED VEHICLES",
    description:
      "Exploring privacy changes in vehicle software updates.",
    href: "/ota-tracker",
    status: "In development",
  },
  {
    number: "02",
    name: "IP Flow",
    category: "INTELLECTUAL PROPERTY",
    description:
      "A practical approach to structuring IP clearance workflows.",
    href: "https://YOUR-IP-FLOW-URL",
    status: "Planned",
  },
  {
    number: "03",
    name: "PrivacyFlow",
    category: "DATA PRIVACY",
    description:
      "Exploring clearer, more consistent privacy review processes.",
    href: "https://YOUR-PRIVACYFLOW-URL",
    status: "In development",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f6f1] text-[#203632] lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-10 lg:h-screen lg:px-14">
        <header className="flex items-center justify-between border-b border-[#dce2d9] py-5">
          <a href="#" className="text-lg font-semibold tracking-tight">
            workflow lab<span className="text-teal-700">.</span>
          </a>

          <nav className="flex items-center gap-6 text-sm text-[#52645e]">
            <a href="#projects" className="hover:text-teal-800">
              Projects
            </a>
            <a href="#contact" className="hover:text-teal-800">
              Contact
            </a>
          </nav>
        </header>

        <section className="grid flex-1 content-center gap-8 py-10 lg:grid-cols-[1fr_0.8fr] lg:gap-16 lg:py-8">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-800">
              Independent project studio
            </p>

            <h1 className="mt-5 text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
              Ideas into
              <br />
              <span className="text-teal-800">workflows.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-[#5a6a63]">
              Workflow Lab is an independent initiative exploring
              practical ideas at the intersection of law, privacy
              and technology.
            </p>

            <div className="mt-12 hidden border-t border-[#dce2d9] pt-5 sm:block">
              <p className="text-xs leading-5 text-[#75837c]">
                An ongoing collection of independent experiments
                and work in progress.
              </p>
            </div>
          </div>

          <div id="projects" className="flex flex-col justify-center">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-sm font-semibold">Selected projects</h2>
              <span className="text-xs text-[#75837c]">01 — 03</span>
            </div>

            <div className="space-y-3">
              {projects.map((project) => (
                <a
                  key={project.number}
                  href={project.href}
                  className="group block border border-[#dce2d9] bg-white/70 p-5 transition hover:border-[#9aafa3] hover:bg-white sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-teal-800">
                      {project.number}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#78867e]">
                      {project.status}
                    </span>
                  </div>

                  <p className="mt-4 text-[10px] font-semibold tracking-[0.17em] text-[#6e8177]">
                    {project.category}
                  </p>

                  <div className="mt-1 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-medium tracking-tight">
                      {project.name}
                    </h3>
                    <span className="text-lg text-teal-800 transition-transform group-hover:translate-x-1">
                      ↗
                    </span>
                  </div>

                  <p className="mt-2 max-w-md text-sm leading-5 text-[#5a6a63]">
                    {project.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <footer
          id="contact"
          className="flex flex-col gap-3 border-t border-[#dce2d9] py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-xs text-[#75837c]">
            Workflow Lab · Independent project · 2026
          </p>

          <a
            href="mailto:your-email@example.com"
            className="text-sm font-medium text-[#28594d] hover:text-teal-800"
          >
            Contact ↗
          </a>
        </footer>
      </div>
    </main>
  );
}

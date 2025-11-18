import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold text-zinc-900">About Hamrosewa</h1>
      <p className="mt-2 text-zinc-600">Connecting households in Kathmandu Valley with trusted local professionals.</p>

      <section className="mt-8 grid gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">What we do</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Hamrosewa makes it easy to book reliable services like cleaning, plumbing, electrician work, painting, gardening,
            pest control, dial-a-driver, and carpentry. Tell us what you need and we match you with nearby, verified professionals.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">Our mission</h2>
          <p className="mt-2 text-sm text-zinc-700">
            To bring convenience, trust, and transparency to home services in Nepal—so you can get things done quickly and confidently.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">How it works</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm text-zinc-700 space-y-1">
            <li>Choose a service and your city.</li>
            <li>Describe your need and post a job.</li>
            <li>We notify nearby pros and keep you updated.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">Coverage</h2>
          <p className="mt-2 text-sm text-zinc-700">We currently serve Kathmandu, Lalitpur, and Bhaktapur.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">Contact</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Email: <a className="text-rose-600">hamrosewa00@edu.np</a><br/>
            Phone: <a  className="text-rose-600">+977 980-000-0001</a>, <a href="tel:+9779800000002" className="text-rose-600">+977 980-000-0002</a>
          </p>
        </div>
      </section>

      <div className="mt-8">
        <Link href="/" className="text-rose-600">Back to home</Link>
      </div>
    </main>
  );
}

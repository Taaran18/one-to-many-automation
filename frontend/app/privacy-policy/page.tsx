import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — One-to-Many Automations",
  description: "Privacy Policy for One-to-Many Automations platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-600 mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: April 17, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
            <p>One-to-Many Automations ("we", "our", or "us") operates the platform available at this website. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold mb-1">Account Information</h3>
            <p className="mb-3">When you register or sign in with Google, we collect your full name, email address, profile picture, company name and type, and phone number.</p>
            <h3 className="font-semibold mb-1">Google Account Access</h3>
            <p className="mb-3">When you connect your Gmail account to send emails through our platform, we request access to send emails on your behalf. We do <strong>not</strong> read, store, or share the contents of your Gmail inbox.</p>
            <h3 className="font-semibold mb-1">Usage Data</h3>
            <p>We collect campaign activity, message logs, lead and contact data you upload, and templates you create.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide and operate the platform</li>
              <li>To send WhatsApp and email messages on your behalf</li>
              <li>To authenticate your identity and maintain your session</li>
              <li>To improve and develop new features</li>
              <li>To respond to support requests</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">4. Google API Data</h2>
            <p>Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We only use Gmail access to send emails you initiate, and we do not transfer Gmail data to third parties or use it for advertising.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">5. Data Storage and Security</h2>
            <p>Your data is stored securely using encrypted data transmission (HTTPS/TLS), encrypted storage of sensitive credentials, and JWT-based authentication with expiry.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You may request deletion by contacting us at <a href="mailto:taaranjain16@gmail.com" className="text-indigo-500 hover:underline">taaranjain16@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">7. Your Rights</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke Google account access at any time via <a href="https://myaccount.google.com/permissions" className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">8. Contact Us</h2>
            <p>Email: <a href="mailto:taaranjain16@gmail.com" className="text-indigo-500 hover:underline">taaranjain16@gmail.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

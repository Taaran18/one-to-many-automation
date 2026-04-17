import Link from "next/link";

export const metadata = {
  title: "Terms of Service — One-to-Many Automations",
  description: "Terms of Service for One-to-Many Automations platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-600 mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: April 17, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using One-to-Many Automations, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
            <p>One-to-Many Automations is a messaging automation platform that allows users to send bulk WhatsApp and email messages, manage leads and contacts, create message templates, and schedule campaigns.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">3. Account Registration</h2>
            <p>To use the Service, you must register with a valid email or Google account, provide accurate information, keep your credentials secure, and be at least 18 years of age. You are responsible for all activity under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">4. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Send spam, unsolicited messages, or harassing content</li>
              <li>Violate WhatsApp's Terms of Service or Meta's policies</li>
              <li>Violate any applicable anti-spam laws (CAN-SPAM, GDPR, TRAI, etc.)</li>
              <li>Attempt to gain unauthorised access to the platform</li>
              <li>Impersonate any person or organisation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">5. Google and Gmail Integration</h2>
            <p>When you connect your Gmail account, you grant us permission to send emails on your behalf. You can revoke this at any time via <a href="https://myaccount.google.com/permissions" className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>. You remain responsible for all emails sent through your connected account and must comply with Google's Terms of Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">6. WhatsApp Integration</h2>
            <p>You must comply with <a href="https://www.whatsapp.com/legal/terms-of-service" className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">WhatsApp's Terms of Service</a>. Bulk messaging must only be sent to contacts who have opted in. We are not responsible for account bans imposed by WhatsApp.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, One-to-Many Automations shall not be liable for any indirect or consequential damages, loss of data, account suspensions by third-party platforms, or service interruptions. The Service is provided "as is".</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">8. Termination</h2>
            <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may delete your account at any time by contacting <a href="mailto:taaranjain16@gmail.com" className="text-indigo-500 hover:underline">taaranjain16@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">9. Governing Law</h2>
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">10. Contact Us</h2>
            <p>Email: <a href="mailto:taaranjain16@gmail.com" className="text-indigo-500 hover:underline">taaranjain16@gmail.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

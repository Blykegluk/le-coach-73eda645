export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-6">Last updated: April 3, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Introduction</h2>
          <p>The Perfect Coach ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
          <p><strong>Account Information:</strong> Name, email address, and profile picture when you sign up via Google or email.</p>
          <p><strong>Fitness Data:</strong> Workout logs, nutrition entries, body measurements, and goals you provide.</p>
          <p><strong>Third-Party Data:</strong> When you connect a third-party account (e.g., TikTok), we access only the data you authorize, such as your public profile information (display name, avatar, open ID) and content publishing permissions.</p>
          <p><strong>Usage Data:</strong> Anonymous analytics about how you interact with the Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Provide personalized coaching, training programs, and nutrition analysis</li>
            <li>Authenticate your identity and manage your account</li>
            <li>Publish content to third-party platforms on your behalf when you explicitly authorize it</li>
            <li>Improve and maintain the Service</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Integrations</h2>
          <p><strong>TikTok:</strong> If you connect your TikTok account, we use the TikTok API to read your basic profile information and publish or upload video content on your behalf. We only access scopes you explicitly authorize (user.info.basic, video.publish, video.upload). You can disconnect TikTok at any time from your TikTok account settings.</p>
          <p>We do not sell, share, or transfer your TikTok data to any third party. TikTok data is used solely to provide the publishing feature within our Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Data Storage and Security</h2>
          <p>Your data is stored securely using industry-standard encryption. We use Supabase for data storage with row-level security policies. We do not store third-party access tokens longer than necessary for the authorized session.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data only with:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Service providers necessary to operate the platform (hosting, authentication)</li>
            <li>Third-party platforms you explicitly authorize (e.g., TikTok for content publishing)</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Access and download your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and all associated data</li>
            <li>Revoke third-party integrations at any time</li>
            <li>Withdraw consent for data processing</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Data Retention</h2>
          <p>We retain your data for as long as your account is active. Upon account deletion, all personal data is permanently removed within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Children's Privacy</h2>
          <p>The Service is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">11. Contact</h2>
          <p>For privacy-related questions, contact us at: anthony.bouskila@gmail.com</p>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-500">
        <a href="/" className="text-teal-400 hover:underline">← Back to The Perfect Coach</a>
        {" · "}
        <a href="/terms" className="text-teal-400 hover:underline">Terms of Service</a>
      </div>
    </div>
  );
}

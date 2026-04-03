export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-6">Last updated: April 3, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using The Perfect Coach ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
          <p>The Perfect Coach is an AI-powered fitness coaching platform that provides personalized training programs, nutrition analysis, and progress tracking. The Service may also integrate with third-party platforms, including TikTok, to enable content publishing features for creators.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. User Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Integrations</h2>
          <p>The Service may connect to third-party platforms such as TikTok via their official APIs. When you authorize a third-party connection, you grant the Service permission to interact with that platform on your behalf, within the scope you approve. You may revoke access at any time through the third-party platform's settings.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Content Ownership</h2>
          <p>You retain all rights to the content you create or publish through the Service. By using the Service, you grant us a limited license to process your content solely for the purpose of providing the Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Acceptable Use</h2>
          <p>You agree not to use the Service for any unlawful purpose, to upload harmful content, or to attempt to gain unauthorized access to our systems. We reserve the right to suspend accounts that violate these terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimers</h2>
          <p>The Service is provided "as is" without warranties of any kind. Fitness and nutrition advice provided by the AI is for informational purposes only and should not replace professional medical advice.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, The Perfect Coach shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
          <p>For questions about these Terms, contact us at: anthony.bouskila@gmail.com</p>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-500">
        <a href="/" className="text-teal-400 hover:underline">← Back to The Perfect Coach</a>
        {" · "}
        <a href="/privacy" className="text-teal-400 hover:underline">Privacy Policy</a>
      </div>
    </div>
  );
}

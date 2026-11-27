import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import type { PropertyType } from '../types';
import { PROPERTY_TYPE_LABELS } from '../utils/format';

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [propertyType, setPropertyType] = useState<string>('Land / Plot');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('Loading check...');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    try {
      const data = await apiFetch<{ challengeId: string; question: string }>('/captcha');
      setCaptchaId(data.challengeId);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch {
      setCaptchaQuestion('Could not load check. Click refresh.');
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    void fetchCaptcha();
  }, [fetchCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !email.trim() || !message.trim() || !captchaAnswer.trim()) {
      setFeedback({
        type: 'error',
        text: 'Please fill in all required fields and answer the security math question.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiFetch<{ message: string }>('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          propertyType,
          message: message.trim(),
          captchaChallengeId: captchaId,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });

      setFeedback({
        type: 'success',
        text: res.message,
      });
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCaptchaAnswer('');
      void fetchCaptcha();
    } catch (err) {
      const errMessage =
        err instanceof ApiError
          ? err.message
          : 'Could not save your inquiry right now. Please try again.';
      setFeedback({ type: 'error', text: errMessage });
      if (err instanceof ApiError && err.code === 'INVALID_CAPTCHA') {
        void fetchCaptcha();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-24 mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-6">
          <p className="text-[14px] font-bold tracking-wide text-[#245B45] uppercase">
            LET’S TALK POSSIBILITIES
          </p>
          <h2
            id="contact-heading"
            className="text-[26px] sm:text-[34px] lg:text-[38px] font-bold leading-tight text-[#1F3229]"
          >
            Your next big step starts with a hello.
          </h2>
          <p className="text-[16px] sm:text-[17px] leading-relaxed text-[#666666]">
            Whether you are exploring a residential plot near Othakadai, farmland in Melur, or a
            space for your family or team in Madurai, we are ready to listen and guide you.
          </p>

          <div className="rounded-[24px] border border-[#D3DDD0] bg-[#EEF1E8] p-6 space-y-3">
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#245B45]">
              Direct Phone Guidance
            </p>
            <a
              href="tel:+914522530100"
              className="inline-flex min-h-[44px] items-center gap-3 text-[20px] sm:text-[24px] font-bold text-[#1F3229] hover:text-[#245B45]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#245B45] text-white">
                <Phone className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>+91 452 253 0100</span>
            </a>
            <p className="flex items-center gap-2 text-[14px] sm:text-[16px] font-bold text-[#245B45] pt-1">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Friendly guidance. Zero pressure.</span>
            </p>
          </div>
        </div>

        {/* Right Column Form */}
        <div className="lg:col-span-7 rounded-[28px] border border-[#D3DDD0] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          <h3 className="text-[22px] sm:text-[26px] font-bold text-[#1F3229] mb-6">
            Drop Us a Line.
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="contact-name"
                  className="block mb-2 text-[14px] font-bold text-[#1F3229]"
                >
                  Enter Your Name*
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Your Name*"
                    className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="contact-email"
                  className="block mb-2 text-[14px] font-bold text-[#1F3229]"
                >
                  Enter Email Address*
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address*"
                    className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Property Type */}
              <div>
                <label
                  htmlFor="contact-property-type"
                  className="block mb-2 text-[14px] font-bold text-[#1F3229]"
                >
                  Property Type
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <select
                    id="contact-property-type"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px] sm:text-[17px] text-[#1F3229]"
                  >
                    {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((key) => (
                      <option key={key} value={PROPERTY_TYPE_LABELS[key]}>
                        {PROPERTY_TYPE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="contact-phone"
                  className="block mb-2 text-[14px] font-bold text-[#1F3229]"
                >
                  Enter Phone Number
                </label>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter Phone Number"
                    className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
                  />
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="contact-message"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Enter Your Message here*
              </label>
              <div className="relative">
                <MessageSquare
                  className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#245B45]"
                  aria-hidden="true"
                />
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter Your Message here"
                  className="min-h-[140px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 py-3.5 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
                />
              </div>
            </div>

            {/* Server-Generated Math Captcha */}
            <div className="rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8]/75 p-4">
              <label
                htmlFor="contact-captcha"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Security Check
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex min-h-[48px] items-center rounded-xl bg-white border border-[#D3DDD0] px-4 py-2 text-[16px] sm:text-[17px] font-bold text-[#1F3229]">
                  {captchaQuestion}
                </span>

                <input
                  id="contact-captcha"
                  type="text"
                  inputMode="numeric"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Answer"
                  className="min-h-[48px] w-32 rounded-xl border border-[#D3DDD0] bg-white px-4 text-[16px] sm:text-[17px] text-[#1F3229]"
                />

                <button
                  type="button"
                  onClick={() => void fetchCaptcha()}
                  disabled={loadingCaptcha}
                  aria-label="Refresh math check"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3DDD0] bg-white text-[#245B45] transition hover:bg-[#E8EEE3] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${loadingCaptcha ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-2xl border px-4 py-3.5 text-[14px] sm:text-[16px] font-bold ${
                  feedback.type === 'success'
                    ? 'border-[#245B45] bg-[#EEF1E8] text-[#1F3229]'
                    : 'border-[#D8B490] bg-[#FDF3E7] text-[#8A4A18]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full bg-[#245B45] px-8 py-4 text-[16px] sm:text-[17px] font-bold text-white shadow-sm transition hover:bg-[#173E2F] active:scale-[0.99] disabled:opacity-60"
            >
              <span>{submitting ? 'Sending Message...' : 'Send Message'}</span>
              <ArrowUpRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

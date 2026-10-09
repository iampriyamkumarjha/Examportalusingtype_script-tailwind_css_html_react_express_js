import React, { useMemo, useState } from 'react';
import { storage } from '../../services/storage';

const getDeviceName = () => {
  if (typeof navigator === 'undefined') return 'Current browser';

  const ua = navigator.userAgent;

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown device';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
};

export const AdminSecurity: React.FC = () => {
  const admin = storage.getAdminCredentials();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState('');

  const deviceName = useMemo(() => getDeviceName(), []);

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (currentPassword !== admin.password) {
      setMessage('Current password is incorrect.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirm password do not match.');
      return;
    }

    try {
      await storage.saveAdminCredentials({
        ...admin,
        password: newPassword,
        lastPasswordChanged: new Date().toISOString(),
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (error) {
      console.error('Password update failed:', error);
      setMessage('Password could not be updated. Please try again.');
    }
  };

  return (
    <section className="min-h-full p-5 md:p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Security</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your administrator password and view the device currently signed in.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined"></span>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Update Password</h3>
              <p className="text-sm text-slate-500">Change the password used for Admin Login.</p>
            </div>
          </div>

          <form onSubmit={updatePassword} className="space-y-4">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Show passwords
            </label>

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.includes('successfully')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Update Password
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined"></span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-slate-900">Current Admin Session</h3>
              <p className="text-sm text-slate-500">Only the device you are using right now is shown.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Online
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">{deviceName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Signed in as {admin.name || 'Administrator'}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600">This device</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

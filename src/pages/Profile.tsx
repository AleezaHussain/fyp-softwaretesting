import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore } from '../store/store'
import { User as UserIcon, Mail, Bell, Palette, Lock, Copy, Check } from 'lucide-react'

export const Profile: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk_test_abc123xyz789')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">Profile Settings</h1>
          <p className="text-text-light">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="card text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-secondary to-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <UserIcon size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold font-poppins text-dark-gray mb-1">{user?.name}</h2>
            <p className="text-gray-600 mb-6">{user?.email}</p>
            <button className="btn-primary w-full">Upload Photo</button>
          </div>

          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-poppins text-dark-gray flex items-center gap-2">
                  <UserIcon size={24} className="text-secondary" />
                  Account Information
                </h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="text-primary font-semibold hover:underline"
                >
                  {editMode ? 'Done' : 'Edit'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    onChange={(e) =>
                      updateUser({ name: e.target.value })
                    }
                    disabled={!editMode}
                    className={`input-field ${!editMode ? 'bg-bg-light cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <div className="flex items-center gap-3 input-field bg-bg-light">
                    <Mail size={20} className="text-secondary" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="flex-1 bg-transparent outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <button className="btn-outline w-full">Change Password</button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="card">
              <h3 className="text-xl font-bold font-poppins text-dark-gray flex items-center gap-2 mb-6">
                <Palette size={24} className="text-secondary" />
                Preferences
              </h3>

              <div className="space-y-4">
                {/* Theme */}
                <div>
                  <label className="label">Theme</label>
                  <div className="flex gap-3">
                    {['light', 'dark'].map((theme) => (
                      <button
                        key={theme}
                        className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                          user?.preferences.theme === theme
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Units */}
                <div>
                  <label className="label">Units</label>
                  <div className="flex gap-3">
                    {['metric', 'imperial'].map((unit) => (
                      <button
                        key={unit}
                        className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                          user?.preferences.units === unit
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Bell size={20} />
                    Notifications
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={user?.preferences.notifications || false}
                      onChange={(e) =>
                        updateUser({
                          preferences: {
                            ...user?.preferences!,
                            notifications: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 accent-primary rounded"
                    />
                    <label htmlFor="notifications" className="text-gray-600">
                      Enable email notifications for simulation updates
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="card">
              <h3 className="text-xl font-bold font-poppins text-dark-gray flex items-center gap-2 mb-6">
                <Lock size={24} className="text-primary" />
                API Keys & Integration
              </h3>

              <div className="bg-bg-light p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">API Key</p>
                <div className="flex items-center gap-2 font-fira-code">
                  <input
                    type="password"
                    value="sk_test_abc123xyz789"
                    readOnly
                    className="flex-1 bg-white px-3 py-2 rounded border border-border-light"
                  />
                  <button
                    onClick={handleCopyApiKey}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-red-50 border border-primary rounded-lg">
                <p className="text-sm font-semibold text-primary mb-2">
                  ⚠️ Keep your API key secure
                </p>
                <p className="text-xs text-gray-600">
                  Never share your API key publicly. Regenerate immediately if exposed.
                </p>
              </div>

              <button className="mt-4 btn-outline w-full">Regenerate API Key</button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-2 border-primary bg-red-50 mt-8">
          <h3 className="text-xl font-bold text-primary mb-4">Danger Zone</h3>
          <p className="text-gray-700 mb-4">
            These actions are permanent and cannot be undone.
          </p>
          <div className="flex gap-3">
            <button className="px-6 py-2 border-2 border-primary text-primary rounded-lg hover:bg-red-50 font-semibold transition-all">
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

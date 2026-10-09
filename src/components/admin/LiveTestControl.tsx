import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '../../services/storage';
import { ExamTest } from '../../types';
import { TestQuestionEditor } from './TestQuestionEditor';
import { requestSendResults } from '../../services/resultEmail';
import { generatePin } from '../../services/testPin';

type TestRecord = {
  id: string;
  title?: string;
  name?: string;
  subject?: string;
  description?: string;
  status?: string;
  duration?: number;
  durationMinutes?: number;
  questions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type StorageWithSync = typeof storage & {
  syncFromFirebase?: () => Promise<void>;
};

const syncedStorage = storage as StorageWithSync;

const getTestName = (test: TestRecord) =>
  test.title || test.name || test.subject || `Test ${test.id}`;

const getQuestionCount = (test: TestRecord) =>
  Array.isArray(test.questions) ? test.questions.length : 0;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function LiveTestControl() {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [emailProgress, setEmailProgress] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTests = useCallback(async (syncFirebase = false) => {
    try {
      if (syncFirebase && syncedStorage.syncFromFirebase) {
        await syncedStorage.syncFromFirebase();
      }

      let currentTests = storage.getTests() as unknown as TestRecord[];

      // Purane tests jinke paas PIN nahi hai, unhe ek PIN de do
      const missing = currentTests.filter((t) => !t.accessPin);
      if (missing.length > 0) {
        for (const t of missing) {
          await storage.saveTest({ ...t, accessPin: generatePin() } as unknown as ExamTest);
        }
        currentTests = storage.getTests() as unknown as TestRecord[];
      }
      setTests(currentTests);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Unable to load tests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTests(true);

    // Keep the admin live-test dashboard fresh.
    const interval = window.setInterval(() => {
      void loadTests(true);
    }, 5000);

    const handleStorage = () => {
      void loadTests(false);
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadTests]);

  const liveTests = useMemo(
    () => tests.filter((test) => test.status === 'published'),
    [tests]
  );

  const totalTests = tests.length;
  const liveCount = liveTests.length;

  const stopLiveTest = async (id: string) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;

    const confirmed = window.confirm(
      `Stop "${getTestName(target)}" for students?\\n\\nStudents will no longer be able to start this test as the active published test.`
    );

    if (!confirmed) return;

    try {
      setActionId(id);

      // Any non-"published" status makes the test unavailable to students.
      // "draft" is used so the test can be published again later.
      const updatedTest = {
        ...target,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      } as TestRecord;

      storage.addTest(updatedTest as never);

      // Reload immediately so the counter and list update.
      await loadTests(false);
    } catch (error) {
      console.error('Unable to stop live test:', error);
      window.alert('Could not stop the test. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  const publishTest = async (id: string) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;

    try {
      setActionId(id);

      const updatedTest = {
        ...target,
        status: 'published',
        updatedAt: new Date().toISOString(),
      } as TestRecord;

      storage.addTest(updatedTest as never);
      await loadTests(false);
    } catch (error) {
      console.error('Unable to publish test:', error);
      window.alert('Could not publish the test. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  const deleteTest = async (id: string) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;

    const submitted = storage
      .getSubmissions()
      .filter((s) => String(s.testId) === String(id)).length;

    const confirmed = window.confirm(
      `Delete "${getTestName(target)}" permanently?\n\n` +
        `Is test ke questions hamesha ke liye hat jayenge aur students ko ye test dikhna band ho jayega.` +
        (submitted > 0
          ? `\n\n${submitted} student response(s) safe rahenge (Responses section mein dikhenge).`
          : '') +
        `\n\nYe action undo nahi ho sakta.`
    );
    if (!confirmed) return;

    try {
      setActionId(id);
      await storage.removeTest(id);
      await loadTests(false);
    } catch (error) {
      console.error('Unable to delete test:', error);
      window.alert('Test delete nahi ho paya. Internet / Firestore rules check karke dobara try karo.');
    } finally {
      setActionId(null);
    }
  };

  const setResultPublished = async (id: string, publish: boolean) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;

    const message = publish
      ? `Publish result of "${getTestName(target)}"?\n\nAll students who submitted this test will be able to see their result.`
      : 'Hide the result again? Students will no longer see their result.';
    if (!window.confirm(message)) return;

    try {
      setActionId(id);
      const updatedTest = {
        ...target,
        resultPublished: publish,
        resultPublishedAt: publish ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveTest(updatedTest as unknown as ExamTest);
      await loadTests(false);
    } catch (error) {
      console.error('Unable to update result visibility:', error);
      window.alert('Could not update the result status. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  const emailResults = async (id: string) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;

    const students = storage.getStudents();
    const submissions = storage.getSubmissions().filter((s) => String(s.testId) === String(id));
    if (submissions.length === 0) {
      window.alert('Is test ko abhi kisi student ne submit nahi kiya hai.');
      return;
    }

    const withEmail = submissions.filter((submission) => {
      const fromList = students.find((st) => String(st.id) === String(submission.studentId))?.email || '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((submission.studentEmail || fromList || '').trim());
    }).length;
    const before = target.resultEmailedAt
      ? `\n\nNote: Ye result pehle ${new Date(String(target.resultEmailedAt)).toLocaleString()} par bhej diya gaya tha. Dobara bhejne par students ko dusri email jaayegi.`
      : '';

    const ok = window.confirm(
      `"${getTestName(target)}" ka result email se bhejna hai?\n\n` +
        `${submissions.length} students ne submit kiya hai, in mein se ${withEmail} ka email maujood hai.` +
        (submissions.length - withEmail > 0
          ? `\n${submissions.length - withEmail} students ka email nahi hai, unhe skip kiya jaayega.`
          : '') +
        before
    );
    if (!ok) return;

    try {
      setEmailingId(id);
      setEmailProgress('Sending...');
      const report = await requestSendResults(String(id));

      if (report.sent > 0) {
        await storage.saveTest({
          ...target,
          resultEmailedAt: new Date().toISOString(),
          resultEmailedCount: report.sent,
          updatedAt: new Date().toISOString(),
        } as unknown as ExamTest);
        await loadTests(false);
      }

      let msg = `${report.sent} students ko email bhej diya gaya.`;
      if (report.noEmail.length)
        msg += `\n\nEmail nahi tha (skip): ${report.noEmail.slice(0, 10).join(', ')}${report.noEmail.length > 10 ? '...' : ''}`;
      if (report.failed.length)
        msg +=
          `\n\n${report.failed.length} email fail hui:\n` +
          report.failed.slice(0, 5).map((f) => `${f.name} (${f.email}): ${f.reason}`).join('\n');
      window.alert(msg);
    } catch (error) {
      console.error('Result email failed:', error);
      window.alert(error instanceof Error ? error.message : 'Email bhejne mein dikkat aayi.');
    } finally {
      setEmailingId(null);
      setEmailProgress('');
    }
  };

  const outlineButton: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    borderRadius: '8px',
    padding: '7px 11px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const resultButton = (test: TestRecord) =>
    test.resultPublished ? (
      <button
        type="button"
        onClick={() => void setResultPublished(String(test.id), false)}
        disabled={actionId === String(test.id)}
        style={outlineButton}
      >
        Hide Result
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void setResultPublished(String(test.id), true)}
        disabled={actionId === String(test.id)}
        style={{ ...outlineButton, border: '1px solid #4f46e5', background: '#4f46e5', color: '#ffffff' }}
      >
        Publish Result
      </button>
    );

  const emailButton = (test: TestRecord) => (
    <button
      type="button"
      onClick={() => void emailResults(String(test.id))}
      disabled={emailingId !== null}
      style={{
        ...outlineButton,
        border: '1px solid #99f6e4',
        background: '#f0fdfa',
        color: '#0f766e',
        opacity: emailingId !== null ? 0.65 : 1,
        cursor: emailingId !== null ? 'wait' : 'pointer',
      }}
    >
      {emailingId === String(test.id) ? emailProgress || 'Sending...' : '✉ Email Results'}
    </button>
  );

  const copyPin = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      window.alert(`PIN ${pin} copied.`);
    } catch {
      window.alert(`PIN: ${pin}`);
    }
  };

  const regeneratePin = async (id: string) => {
    const target = tests.find((test) => String(test.id) === String(id));
    if (!target) return;
    if (!window.confirm(`Generate a new PIN for "${getTestName(target)}"?\n\nThe old PIN will stop working immediately.`)) return;
    try {
      setActionId(id);
      await storage.saveTest({ ...target, accessPin: generatePin(), updatedAt: new Date().toISOString() } as unknown as ExamTest);
      await loadTests(false);
    } catch (error) {
      console.error('Unable to change PIN:', error);
      window.alert('PIN change nahi ho paya. Internet check karke dobara try karo.');
    } finally {
      setActionId(null);
    }
  };

  const pinChip = (test: TestRecord) => {
    const pin = String(test.accessPin || '');
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#1e3a8a',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '3px 8px',
          borderRadius: '999px',
        }}
      >
        🔑 PIN: <b style={{ fontFamily: 'monospace', letterSpacing: '1px', fontSize: '13px' }}>{pin || '—'}</b>
        <button
          type="button"
          onClick={() => void copyPin(pin)}
          disabled={!pin}
          style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => void regeneratePin(String(test.id))}
          style={{ border: 'none', background: 'transparent', color: '#b45309', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}
        >
          New PIN
        </button>
      </span>
    );
  };

  const resultBadge = (test: TestRecord) => (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 800,
        color: test.resultPublished ? '#1d4ed8' : '#92400e',
        background: test.resultPublished ? '#dbeafe' : '#fef3c7',
        padding: '4px 8px',
        borderRadius: '999px',
      }}
    >
      {test.resultPublished ? 'RESULT PUBLISHED' : 'RESULT HIDDEN'}
    </span>
  );

  const editButton = (test: TestRecord) => (
    <button
      type="button"
      onClick={() => setEditingId(String(test.id))}
      style={{ ...outlineButton, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8' }}
    >
      View / Edit Questions
    </button>
  );

  const deleteButton = (test: TestRecord) => (
    <button
      type="button"
      onClick={() => void deleteTest(String(test.id))}
      disabled={actionId === String(test.id)}
      style={{ ...outlineButton, border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c' }}
    >
      🗑 Delete
    </button>
  );

  const editingTest = editingId
    ? tests.find((test) => String(test.id) === String(editingId))
    : undefined;

  if (editingTest) {
    return (
      <TestQuestionEditor
        key={String(editingTest.id)}
        test={editingTest as unknown as ExamTest}
        onBack={() => {
          setEditingId(null);
          void loadTests(false);
        }}
      />
    );
  }

  return (
    <section
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '24px',
        background: '#f8fafc',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        color: '#0f172a',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '22px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '25px' }}>📡</span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              Live Test Control
            </h2>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Monitor published tests and stop a live test whenever you need.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTests(true)}
          disabled={loading}
          style={{
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            borderRadius: '10px',
            padding: '10px 15px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>
            TOTAL TESTS CREATED
          </div>
          <div style={{ fontSize: '32px', fontWeight: 850, marginTop: '6px' }}>
            {totalTests}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 700 }}>
            LIVE NOW
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 850,
              marginTop: '6px',
              color: '#16a34a',
            }}
          >
            {liveCount}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>
            LAST SYNC
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '10px' }}>
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Live tests */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
              Currently Live Tests
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
              A test is considered live when its status is <b>published</b>.
            </p>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 10px',
              borderRadius: '999px',
              background: liveCount > 0 ? '#dcfce7' : '#f1f5f9',
              color: liveCount > 0 ? '#166534' : '#64748b',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            <span>●</span>
            {liveCount > 0 ? 'LIVE' : 'NO LIVE TEST'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Loading tests...
          </div>
        ) : liveTests.length === 0 ? (
          <div
            style={{
              padding: '38px 24px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
              No test is live right now
            </div>
            <div style={{ fontSize: '13px' }}>
              Publish a test from your existing test section to make it available to students.
            </div>
          </div>
        ) : (
          <div>
            {liveTests.map((test) => (
              <div
                key={String(test.id)}
                style={{
                  padding: '18px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '18px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '7px',
                    }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'inline-block',
                        boxShadow: '0 0 0 4px #dcfce7',
                      }}
                    />
                    <strong
                      style={{ fontSize: '16px', cursor: 'pointer' }}
                      onClick={() => setEditingId(String(test.id))}
                      title="Click to view / edit questions"
                    >
                      {getTestName(test)}
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#166534',
                        background: '#dcfce7',
                        padding: '4px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      LIVE
                    </span>
                    {resultBadge(test)}
                    {pinChip(test)}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    <span>ID: {String(test.id)}</span>
                    <span>Questions: {getQuestionCount(test)}</span>
                    {(test.durationMinutes || test.duration) && (
                      <span>
                        Duration: {test.durationMinutes || test.duration} min
                      </span>
                    )}
                    <span>Updated: {formatDate(test.updatedAt || test.createdAt)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {editButton(test)}
                {resultButton(test)}
                {emailButton(test)}
                <button
                  type="button"
                  onClick={() => void stopLiveTest(String(test.id))}
                  disabled={actionId === String(test.id)}
                  style={{
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '11px 16px',
                    fontWeight: 800,
                    cursor: actionId === String(test.id) ? 'wait' : 'pointer',
                    opacity: actionId === String(test.id) ? 0.65 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {actionId === String(test.id) ? 'Stopping...' : '■ Stop Live Test'}
                </button>
                {deleteButton(test)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All tests */}
      <div style={{ marginTop: '22px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 800 }}>
          All Tests
        </h3>

        <div
          style={{
            display: 'grid',
            gap: '8px',
          }}
        >
          {tests.map((test) => {
            const isLive = test.status === 'published';

            return (
              <div
                key={`all-${String(test.id)}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 750, fontSize: '14px', cursor: 'pointer' }}
                    onClick={() => setEditingId(String(test.id))}
                    title="Click to view / edit questions"
                  >
                    {getTestName(test)} {resultBadge(test)} {pinChip(test)}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
                    ID: {String(test.id)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {editButton(test)}
                {resultButton(test)}
                {emailButton(test)}
                {isLive ? (
                  <button
                    type="button"
                    onClick={() => void stopLiveTest(String(test.id))}
                    disabled={actionId === String(test.id)}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void publishTest(String(test.id))}
                    disabled={actionId === String(test.id)}
                    style={{
                      border: '1px solid #bbf7d0',
                      background: '#f0fdf4',
                      color: '#15803d',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Publish Live
                  </button>
                )}
                {deleteButton(test)}
                </div>
              </div>
            );
          })}

          {tests.length === 0 && !loading && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#64748b',
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
              }}
            >
              No tests have been created yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

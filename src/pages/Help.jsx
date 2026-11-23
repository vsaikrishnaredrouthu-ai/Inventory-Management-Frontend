import { useState } from 'react';
import api from '../api.js';
import { Card, ErrorBox, Field, Loading, PageHead, fieldErrors, useApi, useToast } from '../ui.jsx';

export default function Help() {
  const toast = useToast();
  const help = useApi(() => api.get('/help').then((r) => r.data), []);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.subject.trim().length < 3) local.subject = 'Add a short subject';
    if (form.message.trim().length < 10) local.message = 'Describe the problem in at least 10 characters';
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await api.post('/support', form);
      setForm({ subject: '', message: '' });
      toast('Thanks. Your request has been sent to support.');
    } catch (err) { setErrors({ ...fieldErrors(err), _form: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Help & support" subtitle="Answers to common questions, and a way to reach us" />
      <div className="grid-2">
        <Card title="Frequently asked questions">
          {help.loading && <Loading />}
          <ErrorBox error={help.error} onRetry={help.reload} />
          {help.data && (
            <div className="faq">
              {help.data.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </Card>

        <div>
          <Card title="Contact support">
            {help.data && (
              <p>
                Email <a href={`mailto:${help.data.contact.email}`}>{help.data.contact.email}</a><br />
                <span className="muted">{help.data.contact.hours}</span>
              </p>
            )}
            <form onSubmit={submit} noValidate>
              {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
              <Field label="Subject" error={errors.subject}><input className="input" value={form.subject} onChange={set('subject')} /></Field>
              <Field label="What do you need help with?" error={errors.message}><textarea className="textarea" value={form.message} onChange={set('message')} /></Field>
              <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

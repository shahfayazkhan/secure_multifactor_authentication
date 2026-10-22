import { Copy, Download, Printer } from 'lucide-react';
import { Button } from './ui';
import { useToast } from '../context/ToastContext';

export default function BackupCodes({ codes, email }) {
  const toast = useToast();
  const text = [
    'SFK Secure — two-factor backup codes',
    ...(email ? [`Account: ${email}`] : []),
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Each code can be used once. Keep them somewhere safe.',
    '',
    ...codes,
  ].join('\n');

  const copy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Backup codes copied to clipboard.');
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sfk-secure-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.write(`<pre style="font:15px/1.8 ui-monospace,monospace;padding:24px">${text}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="backup-codes">
      <ol className="codes-grid">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ol>
      <div className="codes-actions">
        <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>Copy</Button>
        <Button variant="secondary" size="sm" icon={Download} onClick={download}>Download</Button>
        <Button variant="secondary" size="sm" icon={Printer} onClick={print}>Print</Button>
      </div>
    </div>
  );
}

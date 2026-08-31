import { App, Modal, TFolder } from 'obsidian';

export class NewFolderModal extends Modal {
  constructor(
    app: App,
    private parent: TFolder | null,
    private onSubmit: (name: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    const where = this.parent && this.parent.path ? this.parent.name : 'vault root';
    contentEl.createEl('h3', { text: `New folder in ${where}` });
    const input = contentEl.createEl('input', {
      type: 'text',
      attr: { placeholder: 'Folder name', style: 'width: 100%;' },
    });
    input.focus();
    const submit = () => {
      const name = input.value.trim();
      if (!name) return;
      this.close();
      this.onSubmit(name);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    const buttonRow = contentEl.createDiv({ attr: { style: 'margin-top: 12px; text-align: right;' } });
    const btn = buttonRow.createEl('button', { text: 'Create' });
    btn.addEventListener('click', submit);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

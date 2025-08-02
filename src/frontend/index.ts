import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as monaco from "monaco-editor";

// Live reload for development
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
   const ws = new WebSocket(`ws://${window.location.host}/livereload`);
   ws.onmessage = () => {
      // Force hard refresh to clear any cached state
      location.reload();
   };

   // Reconnect on disconnect
   ws.onclose = () => {
      setTimeout(() => {
         location.reload();
      }, 1000);
   };
}

@customElement("cc-app")
export class CCApp extends LitElement {
   // Don't use shadow DOM to allow Tailwind styles
   createRenderRoot() {
      return this;
   }

   @property({ type: String })
   fromVersion = "1.0.0";

   @property({ type: String })
   toVersion = "";

   @property({ type: Array })
   versions: string[] = [];

   @property({ type: Boolean })
   loading = true;

   @property({ type: String })
   error = "";

   private diffEditor?: monaco.editor.IStandaloneDiffEditor;
   private resizeObserver?: ResizeObserver;

   async connectedCallback() {
      super.connectedCallback();
      // Load mock data for now
      await this.loadMockData();
   }

   disconnectedCallback() {
      super.disconnectedCallback();
      this.diffEditor?.dispose();
      this.resizeObserver?.disconnect();
   }

   private async loadMockData() {
      try {
         // Mock versions for testing
         this.versions = ["1.0.0", "1.0.1", "1.0.2", "1.0.67"];
         this.toVersion = this.versions[this.versions.length - 1];
         this.loading = false;

         // Wait for next render cycle
         await this.updateComplete;

         // Initialize diff editor
         if (this.fromVersion && this.toVersion) {
            await this.initializeDiffEditor();
         }
      } catch (err) {
         this.error = "Failed to load versions";
         this.loading = false;
      }
   }

   render() {
      return html`
      <div class="flex flex-col h-screen">
      <header class="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50 flex-shrink-0">
        <div class="px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex flex-col gap-2">
            <!-- Desktop layout -->
            <div class="hidden sm:flex items-center justify-between">
              <div class="flex items-center gap-6">
                <div>
                  <h1 class="text-2xl font-bold text-white">cchistory</h1>
                  <p class="text-neutral-400 text-sm">
                    Track Claude Code prompts over time
                  </p>
                </div>

                <!-- Version selectors -->
                <div class="flex items-center gap-3">
                  <select
                    class="bg-neutral-800 text-white border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                    .value=${this.fromVersion}
                    @change=${this.handleFromVersionChange}
                    ?disabled=${this.loading}
                  >
                    ${this.versions.map(
                       (v) => html`
                      <option value=${v} ?selected=${v === this.fromVersion}>${v}</option>
                    `,
                    )}
                  </select>

                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="text-neutral-500 flex-shrink-0">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m0 0l-6-6m6 6l-6 6"/>
                  </svg>

                  <select
                    class="bg-neutral-800 text-white border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                    .value=${this.toVersion}
                    @change=${this.handleToVersionChange}
                    ?disabled=${this.loading}
                  >
                    ${this.versions.map(
                       (v) => html`
                      <option value=${v} ?selected=${v === this.toVersion}>${v}</option>
                    `,
                    )}
                  </select>
                </div>
              </div>

              <!-- By Mario + GitHub -->
              <div class="flex items-center gap-2 text-neutral-400 text-sm">
                <span>By <a
                  href="https://mariozechner.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-300 hover:text-white transition-colors"
                >Mario</a></span>
                <a
                  href="https://github.com/badlogic/cchistory"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Mobile layout -->
            <div class="flex sm:hidden items-center justify-between gap-2">
              <h1 class="text-xl font-bold text-white flex-shrink-0">cchistory</h1>
              
              <!-- Version selectors on mobile - in first row -->
              <div class="flex items-center gap-2 flex-1 justify-end">
                <select
                  class="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                  .value=${this.fromVersion}
                  @change=${this.handleFromVersionChange}
                  ?disabled=${this.loading}
                >
                  ${this.versions.map(
                     (v) => html`
                    <option value=${v} ?selected=${v === this.fromVersion}>${v}</option>
                  `,
                  )}
                </select>

                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="text-neutral-500 flex-shrink-0">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m0 0l-6-6m6 6l-6 6"/>
                </svg>

                <select
                  class="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                  .value=${this.toVersion}
                  @change=${this.handleToVersionChange}
                  ?disabled=${this.loading}
                >
                  ${this.versions.map(
                     (v) => html`
                    <option value=${v} ?selected=${v === this.toVersion}>${v}</option>
                  `,
                  )}
                </select>
              </div>
            </div>

            <!-- One-liner description with By Mario right-aligned - visible on mobile -->
            <div class="flex sm:hidden items-center justify-between text-neutral-400 text-sm">
              <span>Track Claude Code prompts over time.</span>
              <span class="flex items-center gap-1">
                By <a
                  href="https://mariozechner.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-300 hover:text-white transition-colors"
                >Mario</a>
                <a
                  href="https://github.com/badlogic/cchistory"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                </a>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main class="bg-black text-neutral-300 flex-1">
        <div class="w-full h-full">
          ${
             this.loading
                ? html`
            <div class="text-center py-16">
              <div class="text-neutral-500">Loading versions...</div>
            </div>
          `
                : this.error
                  ? html`
            <div class="text-center py-16">
              <div class="text-red-500">${this.error}</div>
            </div>
          `
                  : html`
            <div id="monaco-container" class="w-full h-full"></div>
          `
          }
        </div>
      </main>
      </div>
    `;
   }

   private async initializeDiffEditor() {
      const container = this.querySelector("#monaco-container") as HTMLElement;
      if (!container) return;

      // Get mock content
      const originalContent = this.getMockContent(this.fromVersion);
      const modifiedContent = this.getMockContent(this.toVersion);

      // Create diff editor
      this.diffEditor = monaco.editor.createDiffEditor(container, {
         theme: "vs-dark",
         readOnly: true,
         renderSideBySide: window.innerWidth >= 768,
         minimap: { enabled: false },
         lineNumbers: "off",
         scrollBeyondLastLine: false,
         automaticLayout: true,
         overviewRulerLanes: 0,
         renderIndicators: false,
         folding: false,
      });

      const originalModel = monaco.editor.createModel(originalContent, "markdown");
      const modifiedModel = monaco.editor.createModel(modifiedContent, "markdown");

      this.diffEditor.setModel({
         original: originalModel,
         modified: modifiedModel,
      });

      // Handle resize
      this.resizeObserver = new ResizeObserver(() => {
         this.diffEditor?.layout();
         // Update options based on width
         const isMobile = window.innerWidth < 768;
         this.diffEditor?.updateOptions({
            renderSideBySide: !isMobile,
         });
      });
      this.resizeObserver.observe(container);
   }

   private getMockContent(version: string): string {
      if (version === "1.0.0") {
         return `# Claude Code Version ${version}

Release Date: 2025-05-22

# User Message

<system-reminder>
As you answer the user's questions, you can use the following context:
## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
</system-reminder>
hey

# System Prompt

You are Claude Code, Anthropic's official CLI for Claude.`;
      } else {
         return `# Claude Code Version ${version}

Release Date: 2025-08-01

# User Message

<system-reminder>
As you answer the user's questions, you can use the following context:
## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files.
</system-reminder>
hey

# System Prompt

You are Claude Code, Anthropic's official CLI for Claude.
You are an interactive CLI tool that helps users with software engineering tasks.

IMPORTANT: Assist with defensive security tasks only.`;
      }
   }

   private async handleFromVersionChange(e: Event) {
      const select = e.target as HTMLSelectElement;
      const newFromVersion = select.value;

      // Ensure from version is not newer than to version
      if (this.compareVersions(newFromVersion, this.toVersion) > 0) {
         select.value = this.fromVersion; // Reset to previous value
         return;
      }

      this.fromVersion = newFromVersion;
      await this.updateDiff();
   }

   private async handleToVersionChange(e: Event) {
      const select = e.target as HTMLSelectElement;
      const newToVersion = select.value;

      // Ensure to version is not older than from version
      if (this.compareVersions(this.fromVersion, newToVersion) > 0) {
         select.value = this.toVersion; // Reset to previous value
         return;
      }

      this.toVersion = newToVersion;
      await this.updateDiff();
   }

   private async updateDiff() {
      if (!this.fromVersion || !this.toVersion || !this.diffEditor) return;

      const originalContent = this.getMockContent(this.fromVersion);
      const modifiedContent = this.getMockContent(this.toVersion);

      // Get current model and dispose it properly
      const currentModel = this.diffEditor.getModel();
      if (currentModel) {
         currentModel.original.dispose();
         currentModel.modified.dispose();
      }

      const originalModel = monaco.editor.createModel(originalContent, "markdown");
      const modifiedModel = monaco.editor.createModel(modifiedContent, "markdown");

      this.diffEditor.setModel({
         original: originalModel,
         modified: modifiedModel,
      });
   }

   // Semantic version comparison
   private compareVersions(a: string, b: string): number {
      const parseVersion = (v: string) => {
         const parts = v.split(".").map((p) => parseInt(p, 10));
         return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0,
         };
      };

      const va = parseVersion(a);
      const vb = parseVersion(b);

      if (va.major !== vb.major) return va.major - vb.major;
      if (va.minor !== vb.minor) return va.minor - vb.minor;
      return va.patch - vb.patch;
   }

   private sortVersions(versions: string[]): string[] {
      return [...versions].sort(this.compareVersions);
   }
}

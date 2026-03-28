// ============================================================
// PART 1 — Plugin Interface & Types
// ============================================================
// Simplified plugin system for EH Universe Code Studio.
// Provides extension points for file events, commands,
// and an event bus for plugin-to-plugin communication.

export interface CodeStudioPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  activate?: (api: PluginAPI) => void | Promise<void>;
  deactivate?: () => void;
}

export interface PluginAPI {
  /** Register a command accessible via command palette */
  registerCommand: (id: string, label: string, handler: () => void) => void;
  /** Show a notification toast */
  showToast: (type: "success" | "error" | "warning" | "info", message: string) => void;
}

export type ExtensionPointType = "onFileOpen" | "onFileSave" | "onCommand";

export interface ExtensionHandler {
  pluginId: string;
  point: ExtensionPointType;
  handler: (...args: unknown[]) => void;
}

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=CodeStudioPlugin, PluginAPI, ExtensionHandler

// ============================================================
// PART 2 — Event Bus
// ============================================================

type EventCallback = (...args: unknown[]) => void;

export class PluginEventBus {
  private channels = new Map<string, Set<EventCallback>>();

  /** Subscribe to an event channel */
  on(channel: string, callback: EventCallback): () => void {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel)!.add(callback);
    return () => { this.channels.get(channel)?.delete(callback); };
  }

  /** Emit an event to all subscribers on the channel */
  emit(channel: string, ...args: unknown[]): void {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return;
    for (const cb of subscribers) {
      try { cb(...args); } catch { /* isolate plugin errors */ }
    }
  }

  /** Remove all listeners on all channels */
  clear(): void {
    this.channels.clear();
  }
}

// IDENTITY_SEAL: PART-2 | role=이벤트 버스 | inputs=channel, args | outputs=이벤트 전달

// ============================================================
// PART 3 — Plugin Registry
// ============================================================

export class PluginRegistry {
  private plugins = new Map<string, CodeStudioPlugin>();
  private extensionHandlers: ExtensionHandler[] = [];
  private commands = new Map<string, { label: string; handler: () => void; pluginId: string }>();
  readonly eventBus = new PluginEventBus();

  /** Register and activate a plugin */
  async register(plugin: CodeStudioPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered`);
      return;
    }

    this.plugins.set(plugin.id, plugin);

    if (plugin.activate) {
      const api = this.createAPI(plugin.id);
      try {
        await plugin.activate(api);
      } catch (err) {
        console.error(`[PluginRegistry] Failed to activate "${plugin.id}":`, err);
        this.plugins.delete(plugin.id);
      }
    }
  }

  /** Unregister and deactivate a plugin */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try { plugin.deactivate?.(); } catch { /* ignore */ }

    // Clean up extension handlers
    this.extensionHandlers = this.extensionHandlers.filter((h) => h.pluginId !== pluginId);

    // Clean up commands
    for (const [cmdId, cmd] of this.commands) {
      if (cmd.pluginId === pluginId) this.commands.delete(cmdId);
    }

    this.plugins.delete(pluginId);
  }

  /** Get a registered plugin by ID */
  getPlugin(pluginId: string): CodeStudioPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** List all registered plugins */
  listPlugins(): CodeStudioPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Trigger an extension point */
  triggerExtensionPoint(point: ExtensionPointType, ...args: unknown[]): void {
    for (const handler of this.extensionHandlers) {
      if (handler.point === point) {
        try { handler.handler(...args); } catch { /* isolate plugin errors */ }
      }
    }
    this.eventBus.emit(point, ...args);
  }

  /** Get all registered commands */
  getCommands(): Array<{ id: string; label: string; pluginId: string }> {
    return Array.from(this.commands.entries()).map(([id, cmd]) => ({
      id, label: cmd.label, pluginId: cmd.pluginId,
    }));
  }

  /** Execute a command by ID */
  executeCommand(commandId: string): boolean {
    const cmd = this.commands.get(commandId);
    if (!cmd) return false;
    try { cmd.handler(); return true; } catch { return false; }
  }

  /** Register an extension point handler (internal, used by PluginAPI) */
  addExtensionHandler(pluginId: string, point: ExtensionPointType, handler: (...args: unknown[]) => void): void {
    this.extensionHandlers.push({ pluginId, point, handler });
  }

  /** Dispose all plugins */
  dispose(): void {
    for (const [id] of this.plugins) {
      this.unregister(id);
    }
    this.eventBus.clear();
  }

  // ── Private ──

  private createAPI(pluginId: string): PluginAPI {
    return {
      registerCommand: (id, label, handler) => {
        const fullId = `${pluginId}.${id}`;
        this.commands.set(fullId, { label, handler, pluginId });
      },
      showToast: (type, message) => {
        this.eventBus.emit("toast", { type, message, pluginId });
      },
    };
  }
}

// IDENTITY_SEAL: PART-3 | role=플러그인 레지스트리 | inputs=CodeStudioPlugin | outputs=register, trigger, commands

// ============================================================
// PART 4 — Factory
// ============================================================

let _globalRegistry: PluginRegistry | null = null;

export function getPluginRegistry(): PluginRegistry {
  if (!_globalRegistry) _globalRegistry = new PluginRegistry();
  return _globalRegistry;
}

export function createPluginRegistry(): PluginRegistry {
  return new PluginRegistry();
}

// IDENTITY_SEAL: PART-4 | role=팩토리 | inputs=none | outputs=PluginRegistry

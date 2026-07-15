'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; title?: string };
type State = { error: string | null };

/** 避免單一面板炸整個分頁 */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-medium">{this.props.title || '區塊'}載入失敗</div>
          <div className="mt-1 text-xs opacity-80">{this.state.error}</div>
          <button
            type="button"
            className="mt-3 rounded-md bg-white px-2 py-1 text-xs text-red-700 ring-1 ring-red-200"
            onClick={() => this.setState({ error: null })}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

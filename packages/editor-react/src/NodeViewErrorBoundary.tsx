import { Component, type ComponentType, type ReactNode } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

interface BoundaryState {
  error: Error | null;
}

export function withNodeViewErrorBoundary(ComponentView: ComponentType<NodeViewProps>) {
  return function NodeViewWithErrorBoundary(props: NodeViewProps) {
    return (
      <NodeViewErrorBoundary nodeName={props.node.type.name}>
        <ComponentView {...props} />
      </NodeViewErrorBoundary>
    );
  };
}

class NodeViewErrorBoundary extends Component<
  { children: ReactNode; nodeName: string },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <NodeViewWrapper data-node-view-error="true">
          <div role="alert">无法渲染 {this.props.nodeName}。</div>
        </NodeViewWrapper>
      );
    }

    return this.props.children;
  }
}

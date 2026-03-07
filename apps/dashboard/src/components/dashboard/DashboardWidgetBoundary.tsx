"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardWidgetBoundaryProps = {
  title: string;
  message?: string;
  resetKey?: string | number | boolean | null;
  children: ReactNode;
};

type DashboardWidgetBoundaryState = {
  hasError: boolean;
};

export class DashboardWidgetBoundary extends Component<DashboardWidgetBoundaryProps, DashboardWidgetBoundaryState> {
  state: DashboardWidgetBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): DashboardWidgetBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[dashboard_widget_error]", this.props.title, error, info);
    }
  }

  componentDidUpdate(prevProps: DashboardWidgetBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-lg">{this.props.title}</CardTitle>
            <CardDescription>{this.props.message ?? "Widget unavailable"}</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-sm text-muted-foreground">Try again in a moment.</p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

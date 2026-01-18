import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // you could log to a service here
    // console.error('ErrorBoundary caught', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded shadow">
          <h2 className="text-xl font-bold text-red-600">An error occurred</h2>
          <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      )
    }

    return this.props.children as any
  }
}

export default ErrorBoundary

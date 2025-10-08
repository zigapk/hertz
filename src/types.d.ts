declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dpin-in": { name: string; value: number; children?: React.ReactNode };
      "dpin-out": { name: string; connectedTo: string };
    }
  }
}

export {};

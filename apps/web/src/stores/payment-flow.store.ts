import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PaymentRoute {
  id: string;
  sourceToken: string;
  destinationToken: string;
  estimatedGas: string;
  estimatedTime: number;
  path: string[];
}

interface PaymentParameters {
  amount: string;
  recipient: string;
  sourceToken: string;
  destinationToken: string;
}

type TransactionStatus =
  | "idle"
  | "route-selection"
  | "approving"
  | "executing"
  | "confirming"
  | "success"
  | "failed";

interface PaymentFlowState {
  currentStep: TransactionStatus;
  selectedRoute?: PaymentRoute;
  parameters?: PaymentParameters;
  transactionHash?: string;
  error?: Error;
  isLoading: boolean;
}

interface PaymentFlowActions {
  setStep: (step: TransactionStatus) => void;
  setRoute: (route: PaymentRoute | undefined) => void;
  setParameters: (parameters: PaymentParameters | undefined) => void;
  setTransactionHash: (hash: string | undefined) => void;
  setError: (error: Error | undefined) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
  startPaymentFlow: (parameters: PaymentParameters) => void;
  completePaymentFlow: (transactionHash: string) => void;
  failPaymentFlow: (error: Error) => void;
}

export type PaymentFlowStore = PaymentFlowState & PaymentFlowActions;

const initialState: PaymentFlowState = {
  currentStep: "idle",
  selectedRoute: undefined,
  parameters: undefined,
  transactionHash: undefined,
  error: undefined,
  isLoading: false,
};

export const usePaymentFlowStore = create<PaymentFlowStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setStep: (currentStep) => set({ currentStep }, false, "setStep"),
      setRoute: (selectedRoute) => set({ selectedRoute }, false, "setRoute"),
      setParameters: (parameters) =>
        set({ parameters }, false, "setParameters"),
      setTransactionHash: (transactionHash) =>
        set({ transactionHash }, false, "setTransactionHash"),
      setError: (error) => set({ error }, false, "setError"),
      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
      reset: () => set(initialState, false, "reset"),
      startPaymentFlow: (parameters) =>
        set(
          {
            parameters,
            currentStep: "route-selection",
            isLoading: true,
            error: undefined,
            transactionHash: undefined,
          },
          false,
          "startPaymentFlow"
        ),
      completePaymentFlow: (transactionHash) =>
        set(
          {
            transactionHash,
            currentStep: "success",
            isLoading: false,
          },
          false,
          "completePaymentFlow"
        ),
      failPaymentFlow: (error) =>
        set(
          {
            error,
            currentStep: "failed",
            isLoading: false,
          },
          false,
          "failPaymentFlow"
        ),
    }),
    { name: "PaymentFlowStore" }
  )
);

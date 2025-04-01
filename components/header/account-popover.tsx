import { Suspense } from "react";
import { AccountInfo } from "./account-info";
import { AccountButton } from "./account-button";

export function AccountPopover() {
  return (
    <AccountButton>
      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-background border z-50">
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          <AccountInfo />
        </Suspense>
      </div>
    </AccountButton>
  );
}

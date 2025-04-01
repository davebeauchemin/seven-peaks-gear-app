import { useState } from "react";
import { formatPhone } from "./format";

// Define a type for the inputs
type InputsType = {
  [key: string]: any;
};

export function useForm(initial: InputsType, fieldsToBeFilled: string[] = []) {
  // Ensure initial values are always defined to avoid "uncontrolled to controlled" errors
  const defaultValues = Object.fromEntries(
    Object.keys(initial).map((key) => [key, initial[key] ?? ""]) // Ensures no undefined values
  );

  const [inputs, setInputs] = useState<InputsType>(defaultValues);

  function handleChange(e: any) {
    let { name, value, type } = e.target;
    if (type === "number") {
      value = parseInt(value) || "";
    }
    if (type === "file") {
      value = e.target.files;
    }
    if (type === "checkbox") {
      value = inputs[name] === true ? false : true;
    }
    if (name === "phone") {
      value = formatPhone(value);
    }
    setInputs({ ...inputs, [name]: value });
  }

  function resetForm() {
    setInputs(defaultValues); // Reset to initial values
  }

  function clearForm() {
    const blankState = Object.fromEntries(
      Object.entries(inputs).map(([key]) => [key, ""])
    );
    setInputs(blankState);
  }

  const isFilled = Object.values(
    Object.fromEntries(
      Object.entries(inputs).reduce<[string, any][]>((arr, input) => {
        const isCondition = fieldsToBeFilled.some(
          (condition) => condition === input[0]
        );
        if (isCondition) return [...arr, input];
        return arr;
      }, [])
    )
  ).every((input) => {
    return !(input === "" || input === undefined || input === null);
  });

  return { inputs, handleChange, setInputs, resetForm, clearForm, isFilled };
}

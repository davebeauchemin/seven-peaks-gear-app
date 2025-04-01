export function formatPhone(input: string) {
  // Strip all characters from the input except digits
  input = input.replace(/\D/g, "");

  // Trim the remaining input to ten characters, to preserve phone number format
  input = input.substring(0, 10);

  // Based upon the length of the string, we add formatting as necessary
  var size = input.length;
  if (size == 0) {
    input = input;
  } else if (size < 4) {
    input = "(" + input;
  } else if (size < 7) {
    input = "(" + input.substring(0, 3) + ") " + input.substring(3, 6);
  } else {
    input =
      "(" +
      input.substring(0, 3) +
      ") " +
      input.substring(3, 6) +
      "-" +
      input.substring(6, 10);
  }
  return input;
}

export function roundMoney(int: number) {
  return Math.round((int + Number.EPSILON) * 100) / 100;
}

export function formatMoney(
  amount = 0,
  style: "decimal" | "currency" | "percent" = "currency"
) {
  const options: Intl.NumberFormatOptions = {
    style: style,
    currency: "CAD",
    minimumFractionDigits: 2,
  };

  // check if its a clean dollar amount
  if (amount % 100 === 0) {
    options.minimumFractionDigits = 2;
  }

  const formatter = Intl.NumberFormat("fr-CA", options);

  return formatter.format(amount / 100);
}

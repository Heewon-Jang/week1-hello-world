type Props = {
  firstName?: string | null;
  lastName?: string | null;
};

export default function NameFields({ firstName, lastName }: Props) {
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900";

  return (
    <>
      <label className="block">
        <span className="mb-1 block font-medium">First name</span>
        <input
          name="first_name"
          defaultValue={firstName ?? ""}
          required
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Last name</span>
        <input
          name="last_name"
          defaultValue={lastName ?? ""}
          required
          className={inputClass}
        />
      </label>
    </>
  );
}

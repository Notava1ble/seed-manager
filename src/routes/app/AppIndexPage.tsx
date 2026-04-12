export function AppIndexPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="mt-2 text-3xl font-semibold">Leagues</h1>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        These are all the leagues you have access to. If you believe you should
        have access to a league that is not listed here, please dm an
        administrator. We should probably have a random seed here which gives a
        random seed from the allowed ones for quick access.
      </p>
    </section>
  );
}

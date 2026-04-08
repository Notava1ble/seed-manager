function Pending({ username }: { username?: string }) {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-2xl ">
        You don't have any role yet. Please notify an admin to give you one
      </h1>
      <p className="text-muted-foreground">Username: {username ?? "Unknown"}</p>
    </div>
  );
}
export default Pending;

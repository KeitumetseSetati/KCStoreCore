using Xunit;

namespace KCStoreCore.Tests.Integration;

// Tests in this collection must not execute concurrently
// with other test collections in this test assembly.
[CollectionDefinition(
    "SQL Server Integration",
    DisableParallelization = true)]
public sealed class SqlServerIntegrationCollection
{
}
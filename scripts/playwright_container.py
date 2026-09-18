#!/usr/bin/env python3
"""Run Playwright while forwarding container localhost ports to the host."""

import asyncio
import signal
import sys


HOST = "host.docker.internal"
PORTS = (3001, 8025)


async def copy_stream(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while data := await reader.read(64 * 1024):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()


async def forward(
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
    port: int,
) -> None:
    try:
        host_reader, host_writer = await asyncio.open_connection(HOST, port)
    except OSError:
        client_writer.close()
        return

    await asyncio.gather(
        copy_stream(client_reader, host_writer),
        copy_stream(host_reader, client_writer),
    )


async def main() -> int:
    if not sys.argv[1:]:
        print("Usage: playwright_container.py <command> [args...]", file=sys.stderr)
        return 2

    servers = []
    for port in PORTS:
        server = await asyncio.start_server(
            lambda reader, writer, port=port: forward(reader, writer, port),
            "127.0.0.1",
            port,
        )
        servers.append(server)

    process = await asyncio.create_subprocess_exec(*sys.argv[1:])
    loop = asyncio.get_running_loop()
    for signum in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signum, process.terminate)

    try:
        return await process.wait()
    finally:
        for server in servers:
            server.close()
        await asyncio.gather(*(server.wait_closed() for server in servers))


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

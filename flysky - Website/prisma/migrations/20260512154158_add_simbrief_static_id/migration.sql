-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PILOT', 'MODERATOR', 'ADMIN', 'AIRLINE_OWNER');

-- CreateEnum
CREATE TYPE "PilotStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('SCHEDULED', 'BOARDING', 'IN_FLIGHT', 'LANDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PirepStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AirlineStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AircraftStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AcarsSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'ABORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PILOT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pilot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "hub" TEXT NOT NULL DEFAULT 'EGLL',
    "airlineId" TEXT,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFlights" INTEGER NOT NULL DEFAULT 0,
    "totalLandings" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "avgLandingRate" DOUBLE PRECISION,
    "status" "PilotStatus" NOT NULL DEFAULT 'ACTIVE',
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "rankId" TEXT,
    "avatarUrl" TEXT,
    "simBriefUser" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFlightAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "minHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minFlights" INTEGER NOT NULL DEFAULT 0,
    "minPoints" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0ea5e9',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#f59e0b',
    "category" TEXT NOT NULL DEFAULT 'achievement',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotBadge" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callsignPrefix" TEXT NOT NULL,
    "icaoCode" TEXT,
    "logoUrl" TEXT,
    "bannerLogoUrl" TEXT,
    "website" TEXT,
    "hub" TEXT NOT NULL DEFAULT 'EGLL',
    "description" TEXT,
    "ownerEmail" TEXT,
    "status" "AirlineStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotAirlineMembership" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotAirlineMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirlineApplication" (
    "id" TEXT NOT NULL,
    "airlineName" TEXT NOT NULL,
    "callsignPrefix" TEXT NOT NULL,
    "icaoCode" TEXT,
    "logoUrl" TEXT,
    "bannerLogoUrl" TEXT,
    "website" TEXT,
    "description" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "hub" TEXT NOT NULL,
    "expectedPilots" INTEGER NOT NULL DEFAULT 0,
    "status" "AirlineStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AirlineApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAircraftType" (
    "id" TEXT NOT NULL,
    "icaoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 180,
    "cargoVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cargoWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetAircraftType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirlineFleet" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "fleetAircraftTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirlineFleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icaoCode" TEXT NOT NULL,
    "hub" TEXT NOT NULL,
    "status" "AircraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalFlights" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "airlineId" TEXT,
    "depIcao" TEXT NOT NULL,
    "arrIcao" TEXT NOT NULL,
    "depIata" TEXT,
    "arrIata" TEXT,
    "depName" TEXT NOT NULL,
    "arrName" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "flightTime" INTEGER NOT NULL,
    "aircraftType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "used" BOOLEAN NOT NULL DEFAULT false,
    "simBriefStaticId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pirep" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "bookingId" TEXT,
    "flightNumber" TEXT NOT NULL,
    "depIcao" TEXT NOT NULL,
    "arrIcao" TEXT NOT NULL,
    "depTime" TIMESTAMP(3) NOT NULL,
    "arrTime" TIMESTAMP(3) NOT NULL,
    "flightTime" INTEGER NOT NULL,
    "distance" INTEGER NOT NULL,
    "landingRate" DOUBLE PRECISION,
    "fuelUsed" DOUBLE PRECISION,
    "passengerCount" INTEGER NOT NULL DEFAULT 0,
    "cargoWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "network" TEXT,
    "callsign" TEXT,
    "route" TEXT,
    "remarks" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "acarsData" JSONB,
    "status" "PirepStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "Pirep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveFlight" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "callsign" TEXT NOT NULL,
    "depIcao" TEXT NOT NULL,
    "arrIcao" TEXT NOT NULL,
    "network" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "altitude" INTEGER NOT NULL DEFAULT 0,
    "heading" INTEGER NOT NULL DEFAULT 0,
    "groundSpeed" INTEGER NOT NULL DEFAULT 0,
    "verticalSpeed" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'PREFLIGHT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveFlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcarsFlightSession" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "pilotCallsign" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "depIcao" TEXT NOT NULL,
    "arrIcao" TEXT NOT NULL,
    "aircraftType" TEXT,
    "aircraftRegistration" TEXT,
    "network" TEXT,
    "status" "AcarsSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxAltitude" INTEGER NOT NULL DEFAULT 0,
    "maxGroundSpeed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcarsFlightSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcarsTelemetryPoint" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "altitude" INTEGER NOT NULL DEFAULT 0,
    "heading" INTEGER NOT NULL DEFAULT 0,
    "groundSpeed" INTEGER NOT NULL DEFAULT 0,
    "verticalSpeed" INTEGER NOT NULL DEFAULT 0,
    "pitch" DOUBLE PRECISION DEFAULT 0,
    "bank" DOUBLE PRECISION DEFAULT 0,
    "onGround" BOOLEAN NOT NULL DEFAULT true,
    "gearDown" BOOLEAN NOT NULL DEFAULT true,
    "flapsPct" DOUBLE PRECISION DEFAULT 0,
    "fuelTotalKg" DOUBLE PRECISION,
    "fuelFlowKgPerH" DOUBLE PRECISION,
    "grossWeightKg" DOUBLE PRECISION,
    "outsideTempC" DOUBLE PRECISION,
    "windSpeedKts" INTEGER,
    "windDirection" INTEGER,
    "phase" TEXT NOT NULL DEFAULT 'PREFLIGHT',

    CONSTRAINT "AcarsTelemetryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "depIcao" TEXT,
    "arrIcao" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetFlights" INTEGER NOT NULL,
    "currentFlights" INTEGER NOT NULL DEFAULT 0,
    "targetHours" DOUBLE PRECISION NOT NULL,
    "currentHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "icao" TEXT NOT NULL,
    "iata" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirlineAirport" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "airportId" TEXT NOT NULL,
    "tickets" INTEGER NOT NULL DEFAULT 70,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirlineAirport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Pilot_userId_key" ON "Pilot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pilot_callsign_key" ON "Pilot"("callsign");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_code_key" ON "Rank"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PilotBadge_pilotId_badgeId_key" ON "PilotBadge"("pilotId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_callsignPrefix_key" ON "Airline"("callsignPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_icaoCode_key" ON "Airline"("icaoCode");

-- CreateIndex
CREATE UNIQUE INDEX "PilotAirlineMembership_pilotId_airlineId_key" ON "PilotAirlineMembership"("pilotId", "airlineId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetAircraftType_icaoCode_key" ON "FleetAircraftType"("icaoCode");

-- CreateIndex
CREATE UNIQUE INDEX "AirlineFleet_airlineId_fleetAircraftTypeId_key" ON "AirlineFleet"("airlineId", "fleetAircraftTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_registration_key" ON "Aircraft"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "Route_flightNumber_key" ON "Route"("flightNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_simBriefStaticId_key" ON "Booking"("simBriefStaticId");

-- CreateIndex
CREATE UNIQUE INDEX "Pirep_bookingId_key" ON "Pirep"("bookingId");

-- CreateIndex
CREATE INDEX "LiveFlight_pilotId_idx" ON "LiveFlight"("pilotId");

-- CreateIndex
CREATE INDEX "AcarsFlightSession_pilotId_status_idx" ON "AcarsFlightSession"("pilotId", "status");

-- CreateIndex
CREATE INDEX "AcarsFlightSession_startedAt_idx" ON "AcarsFlightSession"("startedAt");

-- CreateIndex
CREATE INDEX "AcarsTelemetryPoint_sessionId_recordedAt_idx" ON "AcarsTelemetryPoint"("sessionId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_icao_key" ON "Airport"("icao");

-- CreateIndex
CREATE UNIQUE INDEX "AirlineAirport_airlineId_airportId_key" ON "AirlineAirport"("airlineId", "airportId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotBadge" ADD CONSTRAINT "PilotBadge_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotBadge" ADD CONSTRAINT "PilotBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotAirlineMembership" ADD CONSTRAINT "PilotAirlineMembership_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotAirlineMembership" ADD CONSTRAINT "PilotAirlineMembership_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirlineFleet" ADD CONSTRAINT "AirlineFleet_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirlineFleet" ADD CONSTRAINT "AirlineFleet_fleetAircraftTypeId_fkey" FOREIGN KEY ("fleetAircraftTypeId") REFERENCES "FleetAircraftType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pirep" ADD CONSTRAINT "Pirep_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pirep" ADD CONSTRAINT "Pirep_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pirep" ADD CONSTRAINT "Pirep_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pirep" ADD CONSTRAINT "Pirep_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveFlight" ADD CONSTRAINT "LiveFlight_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveFlight" ADD CONSTRAINT "LiveFlight_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcarsFlightSession" ADD CONSTRAINT "AcarsFlightSession_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcarsTelemetryPoint" ADD CONSTRAINT "AcarsTelemetryPoint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcarsFlightSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirlineAirport" ADD CONSTRAINT "AirlineAirport_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirlineAirport" ADD CONSTRAINT "AirlineAirport_airportId_fkey" FOREIGN KEY ("airportId") REFERENCES "Airport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

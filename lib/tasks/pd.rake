require 'csv'
require 'date'

# CSV loaders expect divvy_data to be located in /lib/tasks

namespace :pd do
	desc "Parse Divvy 2014 stations data into database"
	task stations: :environment do
		file = File.expand_path("../divvy_data/Divvy_Stations_2014-Q1Q2.csv", __FILE__)
		CSV.foreach(file, headers: true) do |row|
			Station.create(
				station_id: row["id"].to_i,
				name: row["name"],
				latitude: row["latitude"].to_f,
				longitude: row["longitude"].to_f,
				dpcapacity: row["dpcapacity"].to_i,
				online_date: Date.strptime(row["online date"], '%m/%d/%Y')
			)
		end
	end

	desc "Parse Divvy 2014 trips data into database"
	task trips: :environment do
		file = File.expand_path("../divvy_data/Divvy_Trips_2014-Q1Q2a.csv", __FILE__)
		# file = File.expand_path("../divvy_data/Divvy_Trips_2014-Q1Q2b.csv", __FILE__)
		# file = File.expand_path("../divvy_data/Divvy_Trips_2014-Q1Q2c.csv", __FILE__)
		# file = File.expand_path("../divvy_data/Divvy_Trips_2014-Q3-0809.csv", __FILE__)
		# file = File.expand_path("../divvy_data/Divvy_Trips_2014-Q4.csv", __FILE__)
		CSV.foreach(file, headers: true) do |row|
			Trip.create(
				trip_id: row["trip_id"].to_i,
				start_time: Date.strptime(row["starttime"], "%m/%d/%Y %H:%M"),
				stop_time: Date.strptime(row["stoptime"], "%m/%d/%Y %H:%M"),
				bike_id: row["bikeid"].to_i,
				trip_duration: row["tripduration"].to_i,
				origin_station_id: row["from_station_id"].to_i,
				destination_station_id: row["to_station_id"].to_i,
				origin_station_name: row["to_station_name"],
				destination_station_name: row["from_station_name"],
				user_type: row["usertype"],
				gender: row["gender"],
				birthday: row["birthday"].to_i,
			)
		end
	end

	desc "Build relations between trips"
	task connect: :environment do
		bike_ids = Set.new(1..3000)
		# Trip.all.each { |trip| bike_ids << trip.bike_id }
		bike_ids.each do |bike_id|
			bike_trips = Trip.where(bike_id: bike_id).order(start_time: :desc).to_a
			bike_trips.each_with_index do |trip, index|
				trip.next_trip = bike_trips[index + 1]
			end
		end
	end
end
